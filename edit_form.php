<?php
/**
 * Per-block settings.
 *
 * @package block_kika_chat
 */

class block_kika_chat_edit_form extends block_edit_form {

    protected function specific_definition($mform) {
        $mform->addElement('header', 'config_header', get_string('blocksettings', 'block'));

        $mform->addElement('text', 'config_title', get_string('blocktitle', 'block_kika_chat'));
        $mform->setDefault('config_title', 'KIKA_CHAT');
        $mform->setType('config_title', PARAM_TEXT);

        if ($this->can_configure_documents()) {
            $mform->addElement('text', 'config_vs_id_qdrant', get_string('vs_id_qdrant', 'block_kika_chat'));
            $mform->setType('config_vs_id_qdrant', PARAM_ALPHANUMEXT);
            $mform->addRule('config_vs_id_qdrant', get_string('required'), 'required', null, 'client');
            $mform->addHelpButton('config_vs_id_qdrant', 'vs_id_qdrant', 'block_kika_chat');

            $mform->addElement('text', 'config_curso', get_string('curso', 'block_kika_chat'));
            $mform->setType('config_curso', PARAM_ALPHANUMEXT);
            $mform->addHelpButton('config_curso', 'curso', 'block_kika_chat');
        } else {
            $config = $this->block->config ?: new stdClass();
            $mform->addElement('hidden', 'config_vs_id_qdrant', $config->vs_id_qdrant ?? '');
            $mform->setType('config_vs_id_qdrant', PARAM_ALPHANUMEXT);
            $mform->addElement('hidden', 'config_curso', $config->curso ?? '');
            $mform->setType('config_curso', PARAM_ALPHANUMEXT);
        }

        $mform->addElement('advcheckbox', 'config_persistconvo', get_string('persistconvo', 'block_kika_chat'));
        $mform->setDefault('config_persistconvo', 1);
        $mform->addHelpButton('config_persistconvo', 'config_persistconvo', 'block_kika_chat');

        if (get_config('block_kika_chat', 'allowinstancesettings') === "1") {
            $mform->addElement('text', 'config_username', get_string('username', 'block_kika_chat'));
            $mform->setDefault('config_username', '');
            $mform->setType('config_username', PARAM_TEXT);

            $mform->addElement('text', 'config_assistantname', get_string('assistantname', 'block_kika_chat'));
            $mform->setDefault('config_assistantname', '');
            $mform->setType('config_assistantname', PARAM_TEXT);
        }
    }

    public function validation($data, $files) {
        $errors = parent::validation($data, $files);
        if (!$this->can_configure_documents()) {
            $config = $this->block->config ?: new stdClass();
            if (($data['config_vs_id_qdrant'] ?? '') !== ($config->vs_id_qdrant ?? '')
                    || ($data['config_curso'] ?? '') !== ($config->curso ?? '')) {
                $errors['config_title'] = get_string('cannotconfiguredocuments', 'block_kika_chat');
            }
        }
        return $errors;
    }

    private function can_configure_documents() {
        return has_capability('block/kika_chat:configure', $this->block->context);
    }
}
