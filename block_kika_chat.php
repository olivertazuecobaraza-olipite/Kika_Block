<?php
/**
 * Block class.
 *
 * @package block_kika_chat
 */

require_once(__DIR__ . '/lib.php');

class block_kika_chat extends block_base {
    public function init() {
        $this->title = get_string('kika_chat', 'block_kika_chat');
    }

    public function has_config() {
        return true;
    }

    public function applicable_formats() {
        return ['all' => true];
    }

    public function specialization() {
        if (!empty($this->config->title)) {
            $this->title = $this->config->title;
        }
    }

    public function hide_header() {
        return true;
    }

    public function get_content() {
        global $CFG, $COURSE, $OUTPUT, $PAGE, $USER;

        if ($this->content !== null) {
            return $this->content;
        }

        $config = $this->config ?: new stdClass();
        $persistconvo = !property_exists($config, 'persistconvo') || (string)$config->persistconvo === '1';
        $vsid = !empty($config->vs_id_qdrant) ? clean_param($config->vs_id_qdrant, PARAM_NOTAGS) : '';
        $curso = !empty($config->curso) ? clean_param($config->curso, PARAM_NOTAGS) : clean_param($COURSE->shortname, PARAM_NOTAGS);

        $assistantname = get_config('block_kika_chat', 'assistantname') ?: get_string('defaultassistantname', 'block_kika_chat');
        $username = get_config('block_kika_chat', 'username') ?: get_string('defaultusername', 'block_kika_chat');
        if (!empty($config->assistantname)) {
            $assistantname = $config->assistantname;
        }
        if (!empty($config->username)) {
            $username = $config->username;
        }
        if (in_array(core_text::strtolower(trim($assistantname)), ['assistant', 'kika'], true)) {
            $assistantname = 'Kika';
        }

        $assistantname = format_string($assistantname, true, ['context' => $this->context]);
        $username = format_string($username, true, ['context' => $this->context]);

        $this->page->requires->js_call_amd('block_kika_chat/lib', 'init', [[
            'blockId' => $this->instance->id,
            'courseId' => (string)$COURSE->id,
            'userId' => (string)(int)$USER->id,
            'persistConvo' => $persistconvo ? '1' : '0',
        ]]);

        $missing = [];
        if (!kika_is_server_configured()) {
            $missing[] = get_string('kika_api_server_config', 'block_kika_chat');
        }
        if ($vsid === '') {
            $missing[] = get_string('vs_id_qdrant', 'block_kika_chat');
        }

        $controlbarhtml = '';
        if (!empty($missing)) {
            $controlbarhtml = '<div class="openai-apikey-missing">' .
                get_string('kikaapiconfigmissing', 'block_kika_chat', implode(', ', $missing)) .
                '</div>';
        } else {
            $controlbarhtml = $OUTPUT->render_from_template('block_kika_chat/control_bar', [
                'logging_enabled' => get_config('block_kika_chat', 'logging'),
                'is_edit_mode' => $PAGE->user_is_editing(),
                'pix_popout' => '/blocks/kika_chat/pix/arrow-up-right-from-square.svg',
                'pix_arrow_right' => '/blocks/kika_chat/pix/arrow-right.svg',
                'pix_refresh' => '/blocks/kika_chat/pix/refresh.svg',
            ]);
        }

        $quickbuttonshtml = '';
        if ($PAGE->context->contextlevel != CONTEXT_USER) {
            $quickbuttonshtml = '
                <div class="bot-buttons-container">
                    <button id="crear-examen" class="quick-chip-btn" type="button">
                        <span class="chip-icon">+</span>
                        <span class="chip-text">Crear examen</span>
                    </button>
                    <button id="crear-resumen" class="quick-chip-btn" type="button">
                        <span class="chip-icon">#</span>
                        <span class="chip-text">Crear resumen</span>
                    </button>
                    <button id="crear-esquema" class="quick-chip-btn" type="button">
                        <span class="chip-icon">=</span>
                        <span class="chip-text">Crear esquema</span>
                    </button>
                    <button id="crear-idea" class="quick-chip-btn" type="button">
                        <span class="chip-icon">*</span>
                        <span class="chip-text">Crear idea</span>
                    </button>
                </div>';
        }

        $logsurl = new moodle_url('/blocks/kika_chat/view_user_logs.php', ['blockid' => $this->instance->id]);

        $this->content = new stdClass();
        $this->content->text = '
            <script>
                var assistantName = ' . json_encode($assistantname) . ';
                var userName = ' . json_encode($username) . ';
            </script>

            <div class="openai-chat-wrapper" data-block-id="' . (int)$this->instance->id . '" data-course-id="' . s((string)$COURSE->id) . '" data-curso="' . s($curso) . '">
                <div class="openai-chat-header">
                    <div class="openai-chat-header-title">
                        <button id="conversation-toggle" class="header-action-btn conversation-toggle" title="Conversaciones" type="button" aria-label="Conversaciones" aria-controls="kika_conversation_panel" aria-expanded="false">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="header-icon">
                                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
                            </svg>
                        </button>
                        <div class="openai-chat-header-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sparkle-svg">
                                <path d="M12 3c0 4.5 3.5 8 8 8-4.5 0-8 3.5-8 8 0-4.5-3.5-8-8-8 4.5 0 8-3.5 8-8z" fill="currentColor"/>
                            </svg>
                        </div>
                        <div class="openai-chat-header-info">
                            <span class="openai-chat-assistant-name">' . $assistantname . '</span>
                            <span class="openai-chat-status"><span class="status-dot"></span>En linea</span>
                        </div>
                    </div>
                    <div class="openai-chat-header-actions">
                        <button id="refresh" class="header-action-btn" title="Nuevo chat" type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="header-icon">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                            </svg>
                        </button>
                        <button id="popout" class="header-action-btn" title="Expandir" type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="header-icon">
                                <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="kika-chat-main">
                    <aside id="kika_conversation_panel" class="kika-conversation-panel" aria-label="Conversaciones" hidden>
                        <div id="kika_conversation_status" class="kika-conversation-status"></div>
                        <div id="kika_conversation_list" class="kika-conversation-list"></div>
                        <button id="kika_new_conversation" class="kika-panel-btn" title="Nueva conversacion" type="button" aria-label="Nueva conversacion">+</button>
                    </aside>

                    <div class="openai-chat-body">
                        <div id="kika_chat_log" role="log"></div>
                        <div id="welcome-message" class="openai-welcome-container">
                            <h2 id="help-text">En que puedo ayudarte?</h2>
                            ' . $quickbuttonshtml . '
                        </div>
                    </div>
                </div>

                <div class="openai-chat-footer">
                    ' . $controlbarhtml . '
                </div>
            </div>';

        $this->content->footer = '';
        return $this->content;
    }
}
