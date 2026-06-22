<?php
// This file is part of the KIKA_CHAT Moodle block.

/**
 * Log table
 *
 * @package    block_kika_chat
 * @copyright  2024 Bryce Yoder <me@bryceyoder.com>
 * @license    MIT
 */

namespace block_kika_chat;
defined('MOODLE_INTERNAL') || die;

class report extends \table_sql {
    function __construct($uniqueid) {
        parent::__construct($uniqueid);
        // Define the list of columns to show.
        $columns = array('userid', 'user_name', 'usermessage', 'airesponse', 'contextid', 'timecreated');
        $this->define_columns($columns);
        $this->no_sorting('usermessage');
        $this->no_sorting('airesponse');

        // Define the titles of columns to show in header.
        $headers = array('ID de usuario', 'Nombre de usuario', 'Mensaje del usuario', 'Respuesta de la IA', 'Contexto', 'Fecha');
        $this->define_headers($headers);
    }

    function col_user_name($values) {
        global $DB;
        $user = $DB->get_record('user', ['id' => $values->userid]);

        if ($this->is_downloading()) {
            return "$user->firstname $user->lastname";
        } else {
            return "<a href='/user/profile.php?id=$values->userid'>$user->firstname $user->lastname</a>";
        }
    }

    function col_contextid($values) {
        if ($this->is_downloading()) {
            return $values->contextid;
        } else {
            $context = \context::instance_by_id($values->contextid);
            return "<a href='" . $context->get_url() . "'>" . $context->get_context_name() ."</a>";
        }
    }

    function col_usermessage($values) {
        return s($values->usermessage);
    }

    function col_airesponse($values) {
        if ($this->is_downloading()) {
            return strip_tags($values->airesponse);
        }
        return clean_text($values->airesponse, FORMAT_HTML);
    }

    function col_timecreated($values) {
        if ($this->is_downloading()) {
            return $values->timecreated;
        } else {
            return userdate($values->timecreated);
        }
    }
}
