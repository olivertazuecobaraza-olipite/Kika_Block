<?php
/**
 * Plugin settings.
 *
 * @package block_kika_chat
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $ADMIN->add('reports', new admin_externalpage(
        'kika_chat_report',
        get_string('kika_chat_logs', 'block_kika_chat'),
        new moodle_url("$CFG->wwwroot/blocks/kika_chat/report.php", ['courseid' => 1]),
        'moodle/site:config'
    ));

    if ($ADMIN->fulltree) {
        require_once($CFG->dirroot . '/blocks/kika_chat/lib.php');
        $settings->add(new admin_setting_configtext(
            'block_kika_chat/kika_api_url',
            get_string('kika_api_url', 'block_kika_chat'),
            get_string('kika_api_urldesc', 'block_kika_chat'),
            '',
            PARAM_URL
        ));

        $settings->add(new admin_setting_configpasswordunmask(
            'block_kika_chat/kika_api_token',
            get_string('kika_api_token', 'block_kika_chat'),
            get_string('kika_api_tokendesc', 'block_kika_chat'),
            ''
        ));

        $licensestatus = kika_is_server_configured()
            ? get_string('yes')
            : get_string('no');
        $settings->add(new admin_setting_description(
            'block_kika_chat/kika_api_license_status',
            get_string('kika_api_license_status', 'block_kika_chat'),
            $licensestatus
        ));

        $settings->add(new admin_setting_configtext(
            'block_kika_chat/assistantname',
            get_string('assistantname', 'block_kika_chat'),
            get_string('assistantnamedesc', 'block_kika_chat'),
            'Kika',
            PARAM_TEXT
        ));

        $settings->add(new admin_setting_configtext(
            'block_kika_chat/username',
            get_string('username', 'block_kika_chat'),
            get_string('usernamedesc', 'block_kika_chat'),
            'User',
            PARAM_TEXT
        ));

        $settings->add(new admin_setting_configcheckbox(
            'block_kika_chat/logging',
            get_string('logging', 'block_kika_chat'),
            get_string('loggingdesc', 'block_kika_chat'),
            0
        ));

        $settings->add(new admin_setting_configcheckbox(
            'block_kika_chat/allowinstancesettings',
            get_string('allowinstancesettings', 'block_kika_chat'),
            get_string('allowinstancesettingsdesc', 'block_kika_chat'),
            1
        ));
    }
}
