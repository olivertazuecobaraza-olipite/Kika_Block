<?php
/**
 * Proxy endpoint for renaming or deleting a KIKA_API conversation.
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
    $requestmethod = $_SERVER['REQUEST_METHOD'];
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        $body = [];
    }
    $action = clean_param($body['action'] ?? '', PARAM_ALPHA);
    $method = $requestmethod;
    if ($requestmethod === 'POST') {
        if ($action === 'rename') {
            $method = 'PATCH';
        } else if ($action === 'delete') {
            $method = 'DELETE';
        }
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

    $path = '/conversations/' . rawurlencode($conversationid);

    if ($method === 'PATCH') {
        $title = clean_param($body['title'] ?? '', PARAM_NOTAGS);
        if (trim($title) === '') {
            http_response_code(400);
            echo json_encode(['error' => get_string('kikaapibadrequest', 'block_kika_chat')]);
            exit;
        }
        $response = kika_api_request('PATCH', $path, $runtime, ['title' => $title]);
        echo json_encode(kika_sanitise_conversation($response));
        exit;
    }

    if ($method === 'DELETE') {
        kika_api_request('DELETE', $path, $runtime);
        echo json_encode(['deleted' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => get_string('methodnotallowed', 'block_kika_chat')]);
} catch (Throwable $e) {
    kika_send_json_error($e);
}
