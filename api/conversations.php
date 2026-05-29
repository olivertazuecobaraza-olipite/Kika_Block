<?php
/**
 * Proxy endpoint for listing or creating KIKA_API conversations.
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
    $body = [];
    if ($method !== 'GET') {
        $decoded = json_decode(file_get_contents('php://input'), true);
        $body = is_array($decoded) ? $decoded : [];
    }
    $blockid = $method === 'GET'
        ? required_param('blockId', PARAM_INT)
        : clean_param($body['blockId'] ?? 0, PARAM_INT);

    $runtime = kika_prepare_ajax_runtime($blockid);

    if (class_exists('\\core\\session\\manager')) {
        \core\session\manager::write_close();
    }

    if ($method === 'GET') {
        $response = kika_api_request(
            'GET',
            '/api/tutor/conversations',
            $runtime,
            null,
            ['course_id' => $runtime['course_id']]
        );
        echo json_encode($response);
        exit;
    }

    if ($method === 'POST') {
        $response = kika_create_remote_conversation($runtime);
        echo json_encode($response);
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
