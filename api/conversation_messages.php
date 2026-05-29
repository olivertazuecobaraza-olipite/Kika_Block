<?php
/**
 * Proxy endpoint for retrieving KIKA_API conversation messages.
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

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => get_string('methodnotallowed', 'block_kika_chat')]);
        exit;
    }

    $blockid = required_param('blockId', PARAM_INT);
    $conversationid = required_param('conversation_id', PARAM_ALPHANUMEXT);
    $runtime = kika_prepare_ajax_runtime($blockid);

    if (class_exists('\\core\\session\\manager')) {
        \core\session\manager::write_close();
    }

    $response = kika_api_request(
        'GET',
        '/api/tutor/conversations/' . rawurlencode($conversationid) . '/messages',
        $runtime
    );

    $messages = [];
    foreach (($response['messages'] ?? []) as $message) {
        $messages[] = [
            'role' => $message['role'] ?? '',
            'message' => format_text($message['content'] ?? '', FORMAT_HTML, ['context' => $runtime['context']]),
            'created_at' => $message['created_at'] ?? null,
        ];
    }

    echo json_encode([
        'conversation_id' => $response['conversation_id'] ?? $conversationid,
        'messages' => $messages,
    ]);
} catch (Throwable $e) {
    $code = (int)$e->getCode();
    http_response_code($code >= 400 && $code <= 599 ? $code : 500);
    $detail = property_exists($e, 'debuginfo') && !empty($e->debuginfo) ? $e->debuginfo : $e->getMessage();
    echo json_encode(['error' => $detail]);
}
