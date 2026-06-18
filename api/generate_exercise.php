<?php
/**
 * Proxy endpoint for generating exercises with KIKA_API.
 *
 * @package block_kika_chat
 */

define('AJAX_SCRIPT', true);

require_once('../../../config.php');
require_once($CFG->dirroot . '/blocks/kika_chat/lib.php');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => get_string('methodnotallowed', 'block_kika_chat')]);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['error' => get_string('invalidjson', 'block_kika_chat')]);
        exit;
    }

    $blockid = clean_param($body['blockId'] ?? 0, PARAM_INT);
    $conversationid = clean_param($body['conversation_id'] ?? '', PARAM_ALPHANUMEXT);
    if ($conversationid === '') {
        http_response_code(400);
        echo json_encode(['error' => get_string('kikaconversationnotfound', 'block_kika_chat')]);
        exit;
    }

    $runtime = kika_prepare_ajax_runtime($blockid);
    require_sesskey();

    if (class_exists('\\core\\session\\manager')) {
        \core\session\manager::write_close();
    }

    $payload = [
        'tema' => kika_require_generator_text($body, 'tema'),
        'tipo' => kika_require_generator_choice($body, 'tipo', ['practica_guiada', 'caso_aplicado', 'preguntas', 'actividad_creativa']),
        'nivel_dificultad' => kika_require_generator_choice($body, 'nivel_dificultad', ['basico', 'intermedio', 'avanzado']),
        'apartados' => kika_require_generator_int($body, 'apartados', 1, 20),
        'incluir_solucion' => !empty($body['incluir_solucion']),
        'indicaciones_adicionales' => kika_clean_optional_instructions($body['indicaciones_adicionales'] ?? ''),
    ];

    $response = kika_api_request(
        'POST',
        '/conversations/' . rawurlencode($conversationid) . '/exercises',
        $runtime,
        $payload
    );

    $result = kika_normalise_generator_response($response, $conversationid, 'ejercicio', $runtime['context']);
    kika_log_message('Generar ejercicio: ' . $payload['tema'], $result['respuesta'], $runtime['context']);
    echo json_encode($result);
} catch (Throwable $e) {
    kika_send_json_error($e);
}
