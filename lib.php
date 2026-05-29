<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

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
    return 'moodle_' . (int)$USER->id;
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

function kika_get_api_base_url() {
    $baseurl = trim((string)get_config('block_kika_chat', 'kika_api_base_url'));
    if ($baseurl === '') {
        throw new moodle_exception('missingkikaapiurl', 'block_kika_chat');
    }
    return rtrim($baseurl, '/');
}

function kika_get_api_key() {
    $apikey = trim((string)get_config('block_kika_chat', 'kika_api_key'));
    if ($apikey === '') {
        throw new moodle_exception('missingkikaapikey', 'block_kika_chat');
    }
    return $apikey;
}

function kika_api_request($method, $path, array $runtime, $body = null, array $query = []) {
    $url = kika_get_api_base_url() . $path;
    if (!empty($query)) {
        $url .= '?' . http_build_query($query);
    }

    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
        'x-api-key: ' . kika_get_api_key(),
        'x-user-id: ' . $runtime['user_api_id'],
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 45,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        throw new Exception($error ?: get_string('kikaapiconnectionerror', 'block_kika_chat'), 502);
    }

    $decoded = null;
    if ($raw !== false && $raw !== '') {
        $decoded = json_decode($raw, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception(get_string('kikaapiinvalidjson', 'block_kika_chat'), 502);
        }
    }

    if ($status >= 400) {
        $message = kika_extract_api_error($decoded, $status);
        throw new Exception($message, $status);
    }

    return $decoded ?: [];
}

function kika_extract_api_error($decoded, $status) {
    if (is_array($decoded)) {
        if (!empty($decoded['error'])) {
            return is_string($decoded['error']) ? $decoded['error'] : json_encode($decoded['error']);
        }
        if (!empty($decoded['errors']) && is_array($decoded['errors'])) {
            $messages = array_map(function($error) {
                return is_array($error) && !empty($error['message']) ? $error['message'] : json_encode($error);
            }, $decoded['errors']);
            return implode(' ', $messages);
        }
    }
    if ($status === 401) {
        return get_string('kikaapiunauthorized', 'block_kika_chat');
    }
    if ($status === 404) {
        return get_string('kikaconversationnotfound', 'block_kika_chat');
    }
    return get_string('kikaapigenericerror', 'block_kika_chat');
}

function kika_create_remote_conversation(array $runtime, $title = null) {
    $body = [
        'course id' => $runtime['course_id'],
        'curso' => $runtime['curso'],
        'vs_id_QDRANT' => $runtime['vs_id_qdrant'],
    ];
    if ($title !== null && trim($title) !== '') {
        $body['title'] = clean_param($title, PARAM_NOTAGS);
    }
    return kika_api_request('POST', '/api/tutor/conversations', $runtime, $body);
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
