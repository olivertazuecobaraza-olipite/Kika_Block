<?php
// This file is part of the KIKA_CHAT Moodle block.

/**
 * Log report table
 *
 * @package    block_kika_chat
 * @copyright  2024 Bryce Yoder <me@bryceyoder.com>
 * @license    MIT
 */

use \block_kika_chat\report;

require_once('../../config.php');
require_once($CFG->libdir.'/tablelib.php');
global $DB;

$courseid = required_param('courseid', PARAM_INT);
$download = optional_param('download', '', PARAM_ALPHA);
$user = optional_param('user', '', PARAM_TEXT);
$starttime = optional_param('starttime', '', PARAM_TEXT);
$endtime = optional_param('endtime', '', PARAM_TEXT);

$pageurl = $CFG->wwwroot . "/blocks/kika_chat/report.php?courseid=$courseid" .
    "&user=$user" .
    "&starttime=$starttime" .
    "&endtime=$endtime";
$starttime_ts = strtotime($starttime);
$endtime_ts = strtotime($endtime);
$course = $DB->get_record('course', ['id' => $courseid]);

$PAGE->set_url($pageurl);
require_login($course);
$context = context_course::instance($courseid);
require_capability('block/kika_chat:viewreport', $context);

$datetime = new DateTime();
$table = new \block_kika_chat\report(time());
$table->show_download_buttons_at(array(TABLE_P_BOTTOM));
$table->is_downloading(
    $download, 
    get_string('downloadfilename', 'block_kika_chat') 
        . '_' 
        . $datetime->format(DateTime::ATOM)
);

if (!$table->is_downloading()) {
    $PAGE->set_pagelayout('report');
    $PAGE->set_title(get_string('kika_chat_logs', 'block_kika_chat'));
    $PAGE->set_heading(get_string('kika_chat_logs', 'block_kika_chat'));
    $PAGE->navbar->add($course->shortname, new moodle_url('/course/view.php', ['id' => $course->id]));
    $PAGE->navbar->add(get_string('kika_chat_logs', 'block_kika_chat'), new moodle_url($pageurl));

    echo $OUTPUT->header();
    echo $OUTPUT->render_from_template('block_kika_chat/report_page', [
        "courseid" => $courseid,
        "user" => $user,
        "starttime" => $starttime,
        "endtime" => $endtime,
        "link" => (new moodle_url("/blocks/kika_chat/report.php"))->out()
    ]);
}

$where = "1=1";
$out = 10;

// If courseid is 1, we're assuming this is an admin report wanting the entire log table
// otherwise, we'll limit it to responses in the course context for this course
if ($courseid !== 1) {
    $where = "c.contextlevel = 50 AND co.id = $courseid";
}

// filter by user, starttime, endtime
if ($user) {
    $where .= " AND CONCAT(u.firstname, ' ', u.lastname) like '%$user%'";
}
if ($starttime_ts) {
    $where .= " AND ocl.timecreated > $starttime_ts";
}
if ($endtime_ts) {
    $where .= " AND ocl.timecreated < $endtime_ts";
}

$table->set_sql(
    "ocl.*, CONCAT(u.firstname, ' ', u.lastname) as user_name", 
    "{block_kika_chat_log} ocl 
        JOIN {user} u ON u.id = ocl.userid 
        JOIN {context} c ON c.id = ocl.contextid
        LEFT JOIN {course} co ON co.id = c.instanceid",
    $where
);
$table->define_baseurl($pageurl);
$table->out($out, true);

if (!$table->is_downloading()) {
    echo $OUTPUT->footer();
}
?>
