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
        $settings->add(new admin_setting_configtext(
            'block_kika_chat/kika_api_base_url',
            get_string('kika_api_base_url', 'block_kika_chat'),
            get_string('kika_api_base_urldesc', 'block_kika_chat'),
            'http://localhost:3000',
            PARAM_URL
        ));

        $settings->add(new admin_setting_configpasswordunmask(
            'block_kika_chat/kika_api_key',
            get_string('kika_api_key', 'block_kika_chat'),
            get_string('kika_api_keydesc', 'block_kika_chat'),
            ''
        ));

        $settings->add(new admin_setting_configcheckbox(
            'block_kika_chat/restrictusage',
            get_string('restrictusage', 'block_kika_chat'),
            get_string('restrictusagedesc', 'block_kika_chat'),
            1
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
