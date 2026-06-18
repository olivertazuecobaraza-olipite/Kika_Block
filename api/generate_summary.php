<?php
/**
 * Proxy endpoint for generating summaries with KIKA_API.
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
        'extension' => kika_require_generator_choice($body, 'extension', ['breve', 'medio', 'detallado']),
        'formato' => kika_require_generator_choice($body, 'formato', ['parrafos', 'puntos_clave', 'esquema']),
        'enfoque' => kika_require_generator_choice($body, 'enfoque', ['conceptos_principales', 'para_estudiar', 'repaso_examen']),
        'indicaciones_adicionales' => kika_clean_optional_instructions($body['indicaciones_adicionales'] ?? ''),
        'web_search' => !empty($body['web_search']),
    ];

    $response = kika_api_request(
        'POST',
        '/conversations/' . rawurlencode($conversationid) . '/summaries',
        $runtime,
        $payload
    );

    $result = kika_normalise_generator_response($response, $conversationid, 'resumen', $runtime['context']);
    kika_log_message('Generar resumen: ' . $payload['tema'], $result['respuesta'], $runtime['context']);
    echo json_encode($result);
} catch (Throwable $e) {
    kika_send_json_error($e);
}
