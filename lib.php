<?php
// This file is part of the KIKA_CHAT Moodle block.

/**
 * General plugin functions
 *
 * @package    block_kika_chat
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Fetch the current API type from the database, defaulting to "chat"
 * @return string
 */
function kika_get_type_to_display() {
    return 'kika_api';
}

function kika_is_valid_api_identifier($value, $maxlength = 64) {
    return is_string($value)
        && $value !== ''
        && core_text::strlen($value) <= $maxlength
        && preg_match('/^[A-Za-z0-9_-]+$/', $value);
}

function kika_get_user_api_id() {
    global $USER;
    return (string)(int)$USER->id;
}

function kika_get_block_runtime($blockid) {
    global $DB;

    $blockid = clean_param($blockid, PARAM_INT);
    if ($blockid <= 0) {
        throw new moodle_exception('invalidblockid', 'block_kika_chat');
    }

    $record = $DB->get_record('block_instances', ['blockname' => 'kika_chat', 'id' => $blockid], '*', MUST_EXIST);
    $instance = block_instance('kika_chat', $record);
    if (!$instance) {
        throw new moodle_exception('invalidblockid', 'block_kika_chat');
    }

    $context = context::instance_by_id($record->parentcontextid);
    try {
        $context = $context->get_course_context();
    } catch (Throwable $e) {
        // Keep the original context for non-course placements.
    }

    $course = null;
    if ($context->contextlevel === CONTEXT_COURSE) {
        $course = $DB->get_record('course', ['id' => $context->instanceid], '*', MUST_EXIST);
    }

    $config = $instance->config ?: new stdClass();
    $courseid = $course ? (string)$course->id : '1';
    $curso = !empty($config->curso) ? $config->curso : ($course ? $course->shortname : 'site');
    $vsid = !empty($config->vs_id_qdrant) ? $config->vs_id_qdrant : '';

    $runtime = [
        'blockid' => $blockid,
        'instance' => $instance,
        'context' => $context,
        'course' => $course,
        'course_id' => $courseid,
        'curso' => clean_param($curso, PARAM_NOTAGS),
        'vs_id_qdrant' => clean_param($vsid, PARAM_NOTAGS),
        'user_api_id' => kika_get_user_api_id(),
    ];

    kika_validate_runtime($runtime);
    return $runtime;
}

function kika_prepare_ajax_runtime($blockid) {
    global $PAGE;

    $runtime = kika_get_block_runtime($blockid);
    $PAGE->set_context($runtime['context']);
    if ($runtime['course']) {
        require_login($runtime['course']);
    } else {
        require_login();
    }
    validate_context($runtime['context']);
    return $runtime;
}

function kika_validate_runtime(array $runtime) {
    if (!kika_is_valid_api_identifier($runtime['user_api_id'], 64)) {
        throw new moodle_exception('invalidkikauserid', 'block_kika_chat');
    }
    if (!kika_is_valid_api_identifier($runtime['course_id'], 64)) {
        throw new moodle_exception('invalidkikacourseid', 'block_kika_chat');
    }
    if (!kika_is_valid_api_identifier($runtime['curso'], 64)) {
        throw new moodle_exception('invalidkikacurso', 'block_kika_chat');
    }
    if (!kika_is_valid_api_identifier($runtime['vs_id_qdrant'], 128)) {
        throw new moodle_exception('missingvsidqdrant', 'block_kika_chat');
    }
}

function kika_get_server_value($name) {
    $value = getenv($name);
    if ($value === false && defined($name)) {
        $value = constant($name);
    }
    if (($value === false || trim((string)$value) === '') && $name === 'KIKA_API_URL') {
        $value = get_config('block_kika_chat', 'kika_api_url');
    }
    if (($value === false || trim((string)$value) === '') && $name === 'KIKA_API_TOKEN') {
        $value = get_config('block_kika_chat', 'kika_api_token');
    }
    return trim((string)$value);
}

function kika_get_api_base_url() {
    $baseurl = kika_get_server_value('KIKA_API_URL');
    if ($baseurl === '') {
        throw new moodle_exception('missingkikaapiurl', 'block_kika_chat');
    }

    $parts = parse_url($baseurl);
    $host = core_text::strtolower($parts['host'] ?? '');
    $islocal = in_array($host, ['localhost', '127.0.0.1', '::1'], true);
    if (!filter_var($baseurl, FILTER_VALIDATE_URL) || (($parts['scheme'] ?? '') !== 'https' && !$islocal)) {
        throw new moodle_exception('invalidkikaapiurl', 'block_kika_chat');
    }
    return rtrim($baseurl, '/');
}

function kika_get_api_token() {
    $token = kika_get_server_value('KIKA_API_TOKEN');
    if ($token === '') {
        throw new moodle_exception('missingkikaapitoken', 'block_kika_chat');
    }
    return $token;
}

function kika_is_server_configured() {
    return kika_get_server_value('KIKA_API_URL') !== '' && kika_get_server_value('KIKA_API_TOKEN') !== '';
}

function kika_log_api_event(array $runtime, $action, $status, $code, $startedat) {
    $event = [
        'component' => 'block_kika_chat',
        'user_id' => $runtime['user_api_id'],
        'course_id' => $runtime['course_id'],
        'action' => $action,
        'http_status' => (int)$status,
        'code' => $code,
        'duration_ms' => (int)round((microtime(true) - $startedat) * 1000),
    ];
    error_log(json_encode($event));
}

function kika_api_request($method, $path, array $runtime, $body = null, array $query = []) {
    $startedat = microtime(true);
    $action = strtoupper($method) . ' ' . $path;
    try {
        $url = kika_get_api_base_url() . $path;
        $token = kika_get_api_token();
    } catch (Throwable $exception) {
        kika_log_api_event($runtime, $action, 500, 'block_kika_missing_server_config', $startedat);
        throw $exception;
    }
    if (!empty($query)) {
        $url .= '?' . http_build_query($query);
    }

    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer ' . $token,
        'x-user-id: ' . $runtime['user_api_id'],
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 90,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        $istimeout = defined('CURLE_OPERATION_TIMEDOUT') && $errno === CURLE_OPERATION_TIMEDOUT;
        kika_log_api_event($runtime, $action, $istimeout ? 504 : 503, $istimeout ? 'block_kika_api_timeout' : 'block_kika_api_unavailable', $startedat);
        throw new Exception(
            get_string($istimeout ? 'kikaapitimeout' : 'kikaapiunavailable', 'block_kika_chat'),
            $istimeout ? 504 : 503
        );
    }

    $decoded = null;
    if ($raw !== false && $raw !== '') {
        $decoded = json_decode($raw, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            kika_log_api_event($runtime, $action, 502, 'block_kika_invalid_response', $startedat);
            throw new Exception(get_string('kikaapiinvalidjson', 'block_kika_chat'), 502);
        }
    }

    if ($status >= 400) {
        $code = $status === 401 ? 'block_kika_license_auth_failed' : 'block_kika_api_error';
        kika_log_api_event($runtime, $action, $status, $code, $startedat);
        throw new Exception(kika_get_public_api_error($status), $status);
    }

    kika_log_api_event($runtime, $action, $status, 'ok', $startedat);
    return $decoded ?: [];
}

function kika_get_public_api_error($status) {
    $strings = [
        400 => 'kikaapibadrequest',
        401 => 'kikaapiunauthorized',
        404 => 'kikaconversationnotfound',
        429 => 'kikaapiratelimited',
        500 => 'kikaapiresponsefailed',
        503 => 'kikaapiunavailable',
        504 => 'kikaapitimeout',
    ];
    return get_string($strings[$status] ?? 'kikaapigenericerror', 'block_kika_chat');
}

function kika_sanitise_remote_html($html, context $context) {
    return format_text(clean_text((string)$html, FORMAT_HTML), FORMAT_HTML, ['context' => $context]);
}

function kika_sanitise_sources($sources) {
    $clean = [];
    foreach (is_array($sources) ? $sources : [] as $source) {
        if (!is_array($source)) {
            continue;
        }
        $url = clean_param($source['url'] ?? '', PARAM_URL);
        $scheme = core_text::strtolower((string)parse_url($url, PHP_URL_SCHEME));
        if (!in_array($scheme, ['http', 'https'], true)) {
            continue;
        }
        $clean[] = [
            'url' => $url,
            'title' => clean_param($source['title'] ?? $url, PARAM_TEXT),
            'date' => clean_param($source['date'] ?? '', PARAM_TEXT),
        ];
    }
    return $clean;
}

function kika_sanitise_conversation($conversation) {
    if (!is_array($conversation)) {
        return [];
    }
    return [
        'conversation_id' => clean_param($conversation['conversation_id'] ?? '', PARAM_ALPHANUMEXT),
        'title' => clean_param($conversation['title'] ?? '', PARAM_TEXT),
        'last_message_at' => clean_param($conversation['last_message_at'] ?? '', PARAM_TEXT),
    ];
}

function kika_sanitise_conversation_list($response) {
    $conversations = [];
    foreach (is_array($response['conversations'] ?? null) ? $response['conversations'] : [] as $conversation) {
        $clean = kika_sanitise_conversation($conversation);
        if ($clean['conversation_id'] !== '') {
            $conversations[] = $clean;
        }
    }
    return ['conversations' => $conversations];
}

function kika_send_json_error(Throwable $exception) {
    $code = (int)$exception->getCode();
    $status = $code >= 400 && $code <= 599 ? $code : 500;
    http_response_code($status);
    echo json_encode(['error' => kika_get_public_api_error($status)]);
}

function kika_get_conversation_instructions($curso) {
    return 'Eres un tutor experto y pedagogico del curso "' . $curso . '".' . "\n\n"
        . "CONTEXTO OFICIAL DISPONIBLE:\n"
        . '{context}';
}

function kika_create_remote_conversation(array $runtime, $title = null) {
    $body = [
        'course id' => $runtime['course_id'],
        'curso' => $runtime['curso'],
        'vs_id_QDRANT' => $runtime['vs_id_qdrant'],
        'instructions' => kika_get_conversation_instructions($runtime['curso']),
    ];
    if ($title !== null && trim($title) !== '') {
        $body['title'] = clean_param($title, PARAM_NOTAGS);
    }
    return kika_api_request('POST', '/conversations', $runtime, $body);
}

/**
 * If setting is enabled, log the user's message and the AI response
 */
function kika_log_message($usermessage, $airesponse, $context) {
    global $USER, $DB;

    if (!get_config('block_kika_chat', 'logging')) {
        return;
    }

    $DB->insert_record('block_kika_chat_log', (object) [
        'userid' => $USER->id,
        'usermessage' => $usermessage,
        'airesponse' => $airesponse,
        'contextid' => $context->id,
        'timecreated' => time()
    ]);
}

function block_kika_chat_extend_navigation_course($nav, $course, $context) {
    global $PAGE;
    $PAGE->requires->css('/blocks/kika_chat/styles.css');

    if ($nav->get('coursereports')) {
        $nav->get('coursereports')->add(
            get_string('kika_chat_logs', 'block_kika_chat'),
            new moodle_url('/blocks/kika_chat/report.php', ['courseid' => $course->id]),
            navigation_node::TYPE_SETTING,
            null
        );
    }
}
?>
