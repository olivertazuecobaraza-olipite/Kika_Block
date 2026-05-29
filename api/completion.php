<?php
/**
 * Proxy endpoint for sending a chat message to KIKA_API.
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
    if (get_config('block_kika_chat', 'restrictusage') !== "0") {
        require_login();
    }

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

    $message = clean_param($body['message'] ?? '', PARAM_NOTAGS);
    $blockid = clean_param($body['blockId'] ?? 0, PARAM_INT);
    $conversationid = clean_param($body['conversationId'] ?? '', PARAM_ALPHANUMEXT);

    if (trim($message) === '') {
        http_response_code(400);
        echo json_encode(['error' => get_string('emptymessage', 'block_kika_chat')]);
        exit;
    }

    $runtime = kika_prepare_ajax_runtime($blockid);

    if (class_exists('\\core\\session\\manager')) {
        \core\session\manager::write_close();
    }

    if ($conversationid === '') {
        $conversation = kika_create_remote_conversation($runtime);
        $conversationid = clean_param($conversation['conversation_id'] ?? '', PARAM_ALPHANUMEXT);
    }

    if ($conversationid === '') {
        throw new moodle_exception('kikaconversationnotcreated', 'block_kika_chat');
    }

    $response = kika_api_request(
        'POST',
        '/api/tutor/conversations/' . rawurlencode($conversationid) . '/messages',
        $runtime,
        ['prompt' => $message]
    );

    $answer = $response['respuesta'] ?? '';
    $answer = format_text($answer, FORMAT_HTML, ['context' => $runtime['context']]);

    kika_log_message($message, $answer, $runtime['context']);

    echo json_encode([
        'conversation_id' => $response['conversation_id'] ?? $conversationid,
        'message' => $answer,
    ]);
} catch (Throwable $e) {
    $code = (int)$e->getCode();
    http_response_code($code >= 400 && $code <= 599 ? $code : 500);
    $detail = property_exists($e, 'debuginfo') && !empty($e->debuginfo) ? $e->debuginfo : $e->getMessage();
    echo json_encode(['error' => $detail]);
}
