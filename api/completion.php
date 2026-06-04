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
    $websearch = !empty($body['web_search']);

    if (trim($message) === '') {
        http_response_code(400);
        echo json_encode(['error' => get_string('emptymessage', 'block_kika_chat')]);
        exit;
    }

    $runtime = kika_prepare_ajax_runtime($blockid);
    require_sesskey();

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
        '/conversations/' . rawurlencode($conversationid) . '/messages',
        $runtime,
        ['prompt' => $message, 'web_search' => $websearch]
    );

    $answer = kika_get_remote_answer($response);
    $answer = kika_sanitise_remote_html($answer, $runtime['context']);
    $sources = kika_sanitise_sources($response['sources'] ?? $response['fuentes'] ?? []);

    kika_log_message($message, $answer, $runtime['context']);

    echo json_encode([
        'conversation_id' => $response['conversation_id'] ?? $conversationid,
        'message' => $answer,
        'web_search_used' => !empty($response['web_search_used']) || !empty($sources),
        'sources' => $sources,
    ]);
} catch (Throwable $e) {
    kika_send_json_error($e);
}
