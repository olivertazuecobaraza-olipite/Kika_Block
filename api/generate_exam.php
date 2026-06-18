<?php
/**
 * Proxy endpoint for generating exams with KIKA_API.
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

    $tipo = kika_require_generator_choice($body, 'tipo', ['test', 'preguntas_abiertas', 'mixto']);
    $testquestions = kika_require_generator_int($body, 'numero_preguntas_test', 0, 99);
    $openquestions = kika_require_generator_int($body, 'numero_preguntas_abiertas', 0, 99);
    if (($tipo === 'test' && ($testquestions <= 0 || $openquestions !== 0))
            || ($tipo === 'preguntas_abiertas' && ($openquestions <= 0 || $testquestions !== 0))
            || ($tipo === 'mixto' && ($testquestions <= 0 || $openquestions <= 0))) {
        throw new Exception(get_string('kikaapibadrequest', 'block_kika_chat'), 400);
    }

    $payload = [
        'tema' => kika_require_generator_text($body, 'tema'),
        'tipo' => $tipo,
        'numero_preguntas_test' => $testquestions,
        'numero_preguntas_abiertas' => $openquestions,
        'nivel_dificultad' => kika_require_generator_choice($body, 'nivel_dificultad', ['basico', 'intermedio', 'avanzado']),
        'indicaciones_adicionales' => kika_clean_optional_instructions($body['indicaciones_adicionales'] ?? ''),
    ];

    $response = kika_api_request(
        'POST',
        '/conversations/' . rawurlencode($conversationid) . '/exams',
        $runtime,
        $payload
    );

    $result = kika_normalise_generator_response($response, $conversationid, 'examen', $runtime['context']);
    kika_log_message('Generar examen: ' . $payload['tema'], $result['respuesta'], $runtime['context']);
    echo json_encode($result);
} catch (Throwable $e) {
    kika_send_json_error($e);
}
