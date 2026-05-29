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
    if (get_config('block_kika_chat', 'restrictusage') !== "0") {
        require_login();
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        $body = [];
    }

    $blockid = clean_param($body['blockId'] ?? 0, PARAM_INT);
    $conversationid = clean_param($body['conversation_id'] ?? '', PARAM_ALPHANUMEXT);
    if ($conversationid === '') {
        http_response_code(400);
        echo json_encode(['error' => get_string('kikaconversationnotfound', 'block_kika_chat')]);
        exit;
    }

    $runtime = kika_prepare_ajax_runtime($blockid);

    if (class_exists('\\core\\session\\manager')) {
        \core\session\manager::write_close();
    }

    $path = '/api/tutor/conversations/' . rawurlencode($conversationid);

    if ($method === 'PATCH') {
        $title = clean_param($body['title'] ?? '', PARAM_NOTAGS);
        $response = kika_api_request('PATCH', $path, $runtime, ['title' => $title]);
        echo json_encode($response);
        exit;
    }

    if ($method === 'DELETE') {
        kika_api_request('DELETE', $path, $runtime);
        http_response_code(204);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => get_string('methodnotallowed', 'block_kika_chat')]);
} catch (Throwable $e) {
    $code = (int)$e->getCode();
    http_response_code($code >= 400 && $code <= 599 ? $code : 500);
    $detail = property_exists($e, 'debuginfo') && !empty($e->debuginfo) ? $e->debuginfo : $e->getMessage();
    echo json_encode(['error' => $detail]);
}
