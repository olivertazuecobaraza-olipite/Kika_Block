var questionString = 'Escribe una pregunta…';
var errorString = 'Se ha producido un error. Inténtalo de nuevo más tarde.';
const uiStrings = {};
const templateFallbackStrings = {
    quick_menu_label: 'Abrir acciones',
    quick_web_search: 'Búsqueda web',
    quick_create_exam: 'Crear examen',
    quick_create_test: 'Crear test',
    quick_create_summary: 'Crear resumen',
    quick_create_exercise: 'Crear ejercicio',
    template_close: 'Cerrar',
    template_cancel: 'Cancelar',
    template_required_error: 'Completa el tema para continuar.',
    template_security_note: 'Tu contenido estará listo en segundos.',
    template_topic_label: '¿De qué tema?',
    template_topic_hint: 'Ejemplo: la fotosíntesis, la Revolución francesa, ecuaciones de primer grado, etc.',
    template_topic_placeholder: 'La fotosíntesis',
    template_additional_label: 'Indicaciones adicionales',
    template_additional_optional: 'Opcional',
    template_additional_placeholder: 'Ej.: Enfocar en conceptos clave vistos en clase.',
    template_difficulty_label: 'Nivel de dificultad',
    template_difficulty_hint: 'Selecciona el nivel adecuado.',
    template_level_basic: 'Básico',
    template_level_intermediate: 'Intermedio',
    template_level_advanced: 'Avanzado',
    template_exam_title: 'Generar examen',
    template_exam_intro: 'Completa estos sencillos pasos y crearemos el examen ideal para tu clase.',
    template_exam_type_label: 'Tipo de examen',
    template_exam_type_hint: 'Elige el formato que prefieras.',
    template_exam_type_test: 'Tipo test',
    template_exam_type_open: 'Preguntas abiertas',
    template_exam_type_mixed: 'Mixto',
    template_exam_questions_label: '¿Cuántas preguntas?',
    template_exam_questions_hint: 'Configura la cantidad por tipo.',
    template_exam_test_suffix: 'test',
    template_exam_open_suffix: 'abiertas',
    template_exam_submit: 'Generar examen',
    template_summary_title: 'Generar resumen',
    template_summary_intro: 'Configura el resumen que necesitas para estudiar o repasar.',
    template_summary_topic_label: '¿Qué tema o unidad?',
    template_summary_length_label: 'Extensión',
    template_summary_length_hint: 'Define la profundidad del resumen.',
    template_summary_length_short: 'Breve',
    template_summary_length_medium: 'Media',
    template_summary_length_detailed: 'Detallada',
    template_summary_format_label: 'Formato',
    template_summary_format_hint: 'Elige cómo quieres leerlo.',
    template_summary_format_paragraphs: 'Párrafos',
    template_summary_format_bullets: 'Puntos clave',
    template_summary_format_outline: 'Esquema',
    template_summary_focus_label: 'Enfoque',
    template_summary_focus_hint: 'Selecciona el objetivo principal.',
    template_summary_focus_concepts: 'Conceptos principales',
    template_summary_focus_study: 'Para estudiar',
    template_summary_focus_exam: 'Para repasar antes del examen',
    template_summary_submit: 'Generar resumen',
    template_exercise_title: 'Generar ejercicio',
    template_exercise_submit: 'Generar ejercicio',
    template_exercise_intro: 'Define la práctica que quieres crear para este curso.',
    template_exercise_type_label: 'Tipo de ejercicio',
    template_exercise_type_hint: 'Elige la actividad que necesitas.',
    template_exercise_type_guided: 'Práctica guiada',
    template_exercise_type_case: 'Caso aplicado',
    template_exercise_type_questions: 'Preguntas',
    template_exercise_type_creative: 'Actividad creativa',
    template_exercise_count_label: '¿Cuántos apartados?',
    template_exercise_count_hint: 'Configura la cantidad de ejercicios o partes.',
    template_exercise_count_suffix: 'apartados',
    template_exercise_solution_label: 'Incluir solución',
    template_exercise_solution_hint: 'Indica si quieres una solución o las respuestas esperadas.',
    template_yes: 'Sí',
    template_no: 'No'
};
let activeTemplateModal = null;
const initializedRoots = new WeakSet();

let state = {
    blockId: null,
    courseId: null,
    userId: null,
    persistConvo: true,
    conversationId: null,
    conversations: [],
    sending: false,
    creatingConversation: false,
    createConversationPromise: null,
    conversationLoadController: null,
    conversationListRequestId: 0,
    textareaFrame: null,
    scrollController: null,
    welcomeTimer: null,
    welcomeFrame: null,
    menuTimer: null,
    panelTimer: null,
    panelFrame: null,
    expandAnimation: null
};
const statesByRoot = new WeakMap();

const templateStringKeys = Object.keys(templateFallbackStrings);

const getString = (key) => uiStrings[key] || templateFallbackStrings[key] || key;

const storageKey = () => `kika_active_conversation_${state.userId}_${state.courseId}_${state.blockId}`;

const apiUrl = (path, params = {}) => {
    const url = new URL(`${M.cfg.wwwroot}/blocks/kika_chat/api/${path}`, window.location.origin);
    url.searchParams.set('sesskey', M.cfg.sesskey);
    Object.keys(params).forEach((key) => url.searchParams.set(key, params[key]));
    return url.toString();
};

const getJson = (response) => response.text().then((text) => {
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch (error) {
        throw new Error(`La respuesta del servidor no es JSON (HTTP ${response.status}).`);
    }

    if (!response.ok) {
        const message = data.error || response.statusText || errorString;
        throw new Error(`HTTP ${response.status}: ${message}`);
    }
    return data;
});

const getBlockRoot = (blockId) => {
    const wrapper = document.querySelector(`.openai-chat-wrapper[data-block-id="${blockId}"]`);
    return wrapper ? wrapper.closest('.block_kika_chat') || wrapper : document;
};

const activateRoot = (root) => {
    if (statesByRoot.has(root)) {
        state = statesByRoot.get(root);
    }
};

const prefersReducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const afterTransition = (element, propertyName, duration, callback) => {
    let timer = null;
    let finished = false;
    const finish = (runCallback = true) => {
        if (finished) return;
        finished = true;
        element.removeEventListener('transitionend', onTransitionEnd);
        if (timer) window.clearTimeout(timer);
        if (runCallback) callback();
    };
    const onTransitionEnd = (event) => {
        if (event.target !== element || (propertyName && event.propertyName !== propertyName)) return;
        finish();
    };
    element.addEventListener('transitionend', onTransitionEnd);
    timer = window.setTimeout(() => finish(), duration + 60);
    return () => finish(false);
};

const scheduleTextareaResize = (input, root = document) => {
    activateRoot(root);
    if (!input) return;
    const rootState = state;
    if (rootState.textareaFrame) {
        window.cancelAnimationFrame(rootState.textareaFrame);
    }
    rootState.textareaFrame = window.requestAnimationFrame(() => {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
        rootState.textareaFrame = null;
    });
};

const setChatHasMessages = (hasMessages, root = document) => {
    const chatBody = root.querySelector('.openai-chat-body');
    if (chatBody) chatBody.classList.toggle('has-messages', hasMessages);
};

const hideWelcome = (immediate = false, root = document) => {
    activateRoot(root);
    const rootState = state;
    const welcomeMsg = root.querySelector("#welcome-message");
    if (!welcomeMsg) return;

    setChatHasMessages(true, root);

    if (rootState.welcomeTimer) {
        rootState.welcomeTimer();
        rootState.welcomeTimer = null;
    }
    if (rootState.welcomeFrame) {
        window.cancelAnimationFrame(rootState.welcomeFrame);
        rootState.welcomeFrame = null;
    }

    welcomeMsg.classList.add("hidden-welcome");

    if (immediate || prefersReducedMotion()) {
        welcomeMsg.classList.add("d-none");
    } else {
        rootState.welcomeTimer = afterTransition(welcomeMsg, 'transform', 220, () => {
            if (welcomeMsg.classList.contains('hidden-welcome')) welcomeMsg.classList.add("d-none");
            rootState.welcomeTimer = null;
        });
    }
};

const showWelcome = (root = document) => {
    activateRoot(root);
    const rootState = state;
    const welcomeMsg = root.querySelector("#welcome-message");
    if (!welcomeMsg) return;
    setChatHasMessages(false, root);
    if (rootState.welcomeTimer) {
        rootState.welcomeTimer();
        rootState.welcomeTimer = null;
    }
    if (rootState.welcomeFrame) window.cancelAnimationFrame(rootState.welcomeFrame);
    welcomeMsg.classList.remove("d-none");
    if (prefersReducedMotion()) {
        welcomeMsg.classList.remove("hidden-welcome");
        return;
    }
    welcomeMsg.classList.add("hidden-welcome");
    rootState.welcomeFrame = window.requestAnimationFrame(() => {
        rootState.welcomeFrame = null;
        welcomeMsg.classList.remove("hidden-welcome");
    });
};

export const init = (data) => {
    const root = getBlockRoot(data.blockId);
    if (initializedRoots.has(root)) {
        activateRoot(root);
        refreshConversationList(true, root);
        return;
    }
    state = {
        blockId: data.blockId,
        courseId: data.courseId,
        userId: data.userId,
        persistConvo: data.persistConvo === "1",
        conversationId: null,
        conversations: [],
        sending: false,
        creatingConversation: false,
        createConversationPromise: null,
        conversationLoadController: null,
        conversationListRequestId: 0,
        textareaFrame: null,
        scrollController: null,
        welcomeTimer: null,
        welcomeFrame: null,
        menuTimer: null,
        panelTimer: null,
        panelFrame: null,
        expandAnimation: null
    };
    statesByRoot.set(root, state);
    initializedRoots.add(root);

    if (state.persistConvo) {
        state.conversationId = localStorage.getItem(storageKey());
    }

    bindInputHandlers(root);
    bindHeaderHandlers(root);
    initButtonHandlers(root);
    initChatScroll(root);
    setChatHasMessages(!!root.querySelector('#kika_chat_log > .openai_message'), root);
    loadStrings();
    refreshConversationList(true, root);
};

const bindInputHandlers = (root) => {
    const inputField = root.querySelector('#openai_input');
    const sendButton = root.querySelector('#go');

    if (inputField) {
        inputField.addEventListener('input', () => scheduleTextareaResize(inputField, root));

        inputField.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendCurrentInput(root);
            }
        });
    }

    if (sendButton) {
        sendButton.addEventListener('click', () => sendCurrentInput(root));
    }
};

const bindHeaderHandlers = (root) => {
    const refreshBtn = root.querySelector('#refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => startNewConversation(root));
    }

    const newConversationBtn = root.querySelector('#kika_new_conversation');
    if (newConversationBtn) {
        newConversationBtn.addEventListener('click', () => startNewConversation(root));
    }

    const conversationList = root.querySelector('#kika_conversation_list');
    if (conversationList) {
        conversationList.addEventListener('click', (event) => {
            activateRoot(root);
            const actionButton = event.target.closest('[data-conversation-action]');
            if (!actionButton) return;
            const conversation = state.conversations.find(
                (item) => item.conversation_id === actionButton.dataset.conversationId
            );
            if (!conversation) return;
            const action = actionButton.dataset.conversationAction;
            if (action === 'open') loadConversation(conversation.conversation_id, root);
            if (action === 'rename') renameConversation(conversation, root);
            if (action === 'delete') deleteConversation(conversation, root);
        });
    }

    const toggleBtn = root.querySelector('#conversation-toggle');
    if (toggleBtn) {
        setConversationPanelOpen(toggleBtn.getAttribute('aria-expanded') === 'true', root);
        toggleBtn.addEventListener('click', () => {
            const wrapper = root.querySelector('.openai-chat-wrapper');
            if (wrapper) {
                setConversationPanelOpen(!wrapper.classList.contains('conversation-panel-open'), root);
            }
        });
    }

    const panelScrim = root.querySelector('.kika-conversation-scrim');
    if (panelScrim) {
        panelScrim.addEventListener('click', () => setConversationPanelOpen(false, root));
    }

    root.addEventListener('keydown', (event) => {
        const wrapper = root.querySelector('.openai-chat-wrapper');
        if (event.key !== 'Escape' || !wrapper || !wrapper.classList.contains('conversation-panel-open')) return;
        if (activeTemplateModal && activeTemplateModal.root === root) return;
        event.preventDefault();
        setConversationPanelOpen(false, root);
    });

    const popoutBtn = root.querySelector('#popout');
    if (popoutBtn) {
        popoutBtn.addEventListener('click', () => {
            activateRoot(root);
            if (document.querySelector('.drawer.drawer-right')) {
                document.querySelector('.drawer.drawer-right').style.zIndex = '1041';
            }
            const block = root.closest('.block_kika_chat') || root;
            if (block) {
                block.classList.toggle('expanded');
                popoutBtn.setAttribute('aria-pressed', block.classList.contains('expanded') ? 'true' : 'false');
                const wrapper = root.querySelector('.openai-chat-wrapper');
                if (wrapper && !prefersReducedMotion() && wrapper.animate) {
                    if (state.expandAnimation) state.expandAnimation.cancel();
                    const baseTransform = window.getComputedStyle(wrapper).transform;
                    const transform = baseTransform === 'none' ? '' : baseTransform;
                    wrapper.classList.add('is-expanding');
                    const animation = wrapper.animate([
                        {opacity: 0.94, transform: `${transform} scale(0.992)`.trim()},
                        {opacity: 1, transform: `${transform} scale(1)`.trim()}
                    ], {
                        duration: 200,
                        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
                    });
                    state.expandAnimation = animation;
                    animation.finished.catch(() => {}).finally(() => {
                        wrapper.classList.remove('is-expanding');
                        if (state.expandAnimation === animation) state.expandAnimation = null;
                    });
                }
            }
        });
    }
};

const setConversationPanelOpen = (open, root = document) => {
    activateRoot(root);
    const rootState = state;
    const wrapper = root.querySelector('.openai-chat-wrapper');
    const panel = root.querySelector('#kika_conversation_panel');
    const toggleBtn = root.querySelector('#conversation-toggle');
    const scrim = root.querySelector('.kika-conversation-scrim');

    if (rootState.panelTimer) {
        rootState.panelTimer();
        rootState.panelTimer = null;
    }
    if (rootState.panelFrame) {
        window.cancelAnimationFrame(rootState.panelFrame);
        rootState.panelFrame = null;
    }

    if (panel) {
        if (open) {
            panel.hidden = false;
            panel.setAttribute('aria-hidden', 'false');
        } else {
            panel.setAttribute('aria-hidden', 'true');
        }
        panel.classList.add('is-motion-active');
    }
    if (scrim) {
        scrim.setAttribute('aria-hidden', open ? 'false' : 'true');
        scrim.classList.add('is-motion-active');
    }
    if (wrapper) {
        if (open && panel && !prefersReducedMotion()) {
            rootState.panelFrame = window.requestAnimationFrame(() => {
                rootState.panelFrame = null;
                if (panel.getAttribute('aria-hidden') === 'false') {
                    wrapper.classList.add('conversation-panel-open');
                }
            });
        } else {
            wrapper.classList.toggle('conversation-panel-open', open);
        }
    }
    const finishMotion = () => {
        if (panel) {
            panel.classList.remove('is-motion-active');
            if (!open && panel.getAttribute('aria-hidden') === 'true') panel.hidden = true;
        }
        if (scrim) scrim.classList.remove('is-motion-active');
        rootState.panelTimer = null;
    };
    if (!panel || prefersReducedMotion()) {
        finishMotion();
    } else {
        rootState.panelTimer = afterTransition(panel, 'transform', 220, finishMotion);
    }
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggleBtn.classList.toggle('active', open);
    }
    if (!open && panel && panel.contains(document.activeElement) && toggleBtn) toggleBtn.focus();
};

const loadStrings = () => {
    require(['core/str'], function(str) {
        str.get_strings([
            {key: 'askaquestion', component: 'block_kika_chat'},
            {key: 'erroroccurred', component: 'block_kika_chat'},
            ...templateStringKeys.map((key) => ({key, component: 'block_kika_chat'}))
        ]).then((results) => {
            questionString = results[0];
            errorString = results[1];
            templateStringKeys.forEach((key, index) => {
                uiStrings[key] = results[index + 2];
            });
        });
    });
};

const sendCurrentInput = (root = document) => {
    activateRoot(root);
    const inputField = root.querySelector('#openai_input');
    if (!inputField) return;

    const value = inputField.value.trim();
    if (value === "" || state.sending) return;
    const webSearch = root.querySelector('#kika_web_search');
    const useWebSearch = webSearch ? webSearch.checked : false;

    hideWelcome(false, root);
    addToChatLog('user', escapeHtml(value), root, {}, {forceFollow: true});
    createCompletion(value, useWebSearch, root);
    inputField.value = '';
    inputField.style.height = 'auto';
    if (webSearch) {
        webSearch.checked = false;
        updateWebSearchState(root);
    }
};

const initButtonHandlers = (root) => {
    const menuToggle = root.querySelector('#kika_quick_menu_toggle');
    const menu = root.querySelector('#kika_quick_menu');
    const webSearch = root.querySelector('#kika_web_search');

    if (menuToggle && menu) {
        menuToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            setQuickMenuOpen(!menuToggle.classList.contains('is-open'), root);
        });

        root.addEventListener('click', (event) => {
            const webSearchButton = event.target.closest('[data-kika-menu-action="web_search"]');
            const templateButton = event.target.closest('[data-kika-template]');
            if (webSearchButton && root.contains(webSearchButton)) {
                event.stopPropagation();
                if (webSearch) {
                    webSearch.checked = !webSearch.checked;
                    updateWebSearchState(root);
                }
                setQuickMenuOpen(false, root);
                const input = root.querySelector('#openai_input');
                if (input) input.focus();
                return;
            }
            if (templateButton && root.contains(templateButton)) {
                setQuickMenuOpen(false, root);
                openTemplateModal(templateButton.dataset.kikaTemplate, root, templateButton);
                return;
            }
            if (!menu.contains(event.target) && event.target !== menuToggle) {
                setQuickMenuOpen(false, root);
            }
        });

        menu.addEventListener('keydown', (event) => handleQuickMenuKeydown(event, root));
        menuToggle.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            setQuickMenuOpen(true, root);
            const items = menu.querySelectorAll('[role^="menuitem"]');
            const target = event.key === 'ArrowDown' ? items[0] : items[items.length - 1];
            if (target) target.focus();
        });
    }

    updateWebSearchState(root);
};

const setQuickMenuOpen = (open, root = document) => {
    activateRoot(root);
    const rootState = state;
    const menuToggle = root.querySelector('#kika_quick_menu_toggle');
    const menu = root.querySelector('#kika_quick_menu');
    if (!menuToggle || !menu) return;

    if (rootState.menuTimer) {
        rootState.menuTimer();
        rootState.menuTimer = null;
    }
    menu.classList.add('is-motion-active');
    if (open) {
        menu.hidden = false;
        window.requestAnimationFrame(() => {
            if (menu.getAttribute('aria-hidden') === 'false') menu.classList.add('is-open');
        });
    } else {
        menu.classList.remove('is-open');
    }
    menuToggle.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    const finishMotion = () => {
        menu.classList.remove('is-motion-active');
        if (!open && menu.getAttribute('aria-hidden') === 'true') menu.hidden = true;
        rootState.menuTimer = null;
    };
    if (prefersReducedMotion()) finishMotion();
    else rootState.menuTimer = afterTransition(menu, 'transform', 180, finishMotion);
};

const handleQuickMenuKeydown = (event, root) => {
    const items = Array.from(root.querySelectorAll('#kika_quick_menu [role^="menuitem"]'));
    const current = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
        event.preventDefault();
        setQuickMenuOpen(false, root);
        root.querySelector('#kika_quick_menu_toggle').focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        items[(current + direction + items.length) % items.length].focus();
    } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        items[event.key === 'Home' ? 0 : items.length - 1].focus();
    }
};

const updateWebSearchState = (root = document) => {
    const webSearch = root.querySelector('#kika_web_search');
    const menuToggle = root.querySelector('#kika_quick_menu_toggle');
    const webSearchItem = root.querySelector('[data-kika-menu-action="web_search"]');
    const enabled = !!(webSearch && webSearch.checked);

    if (menuToggle) {
        menuToggle.classList.toggle('has-web-search', enabled);
    }
    if (webSearchItem) {
        webSearchItem.classList.toggle('is-active', enabled);
        webSearchItem.setAttribute('aria-checked', enabled ? 'true' : 'false');
    }
};

const getTemplateConfigs = () => ({
    exam: {
        title: getString('template_exam_title'),
        intro: getString('template_exam_intro'),
        submit: getString('template_exam_submit'),
        fields: [
            topicStep('topic', getString('template_topic_label')),
            radioStep('examType', getString('template_exam_type_label'), getString('template_exam_type_hint'), [
                {value: 'test', label: getString('template_exam_type_test')},
                {value: 'open', label: getString('template_exam_type_open')},
                {value: 'mixed', label: getString('template_exam_type_mixed')}
            ], 'mixed'),
            numberGroupStep('examQuestions', getString('template_exam_questions_label'), getString('template_exam_questions_hint'), [
                {name: 'testQuestions', value: 10, min: 0, max: 99, suffix: getString('template_exam_test_suffix')},
                {name: 'openQuestions', value: 2, min: 0, max: 99, suffix: getString('template_exam_open_suffix')}
            ]),
            radioStep('difficulty', getString('template_difficulty_label'), getString('template_difficulty_hint'), [
                {value: 'basic', label: getString('template_level_basic'), icon: 'book'},
                {value: 'intermediate', label: getString('template_level_intermediate'), icon: 'bars'},
                {value: 'advanced', label: getString('template_level_advanced'), icon: 'rocket'}
            ], 'intermediate'),
            textareaStep('additional', getString('template_additional_label'), getString('template_additional_optional'))
        ],
        endpoint: 'generate_exam.php',
        userMessage: (values) => `Generar examen: ${values.topic}`,
        buildPayload: (values) => ({
            tema: values.topic,
            tipo: mapValue('examType', values.examType),
            numero_preguntas_test: getExamQuestionCounts(values).test,
            numero_preguntas_abiertas: getExamQuestionCounts(values).open,
            nivel_dificultad: mapValue('difficulty', values.difficulty),
            indicaciones_adicionales: values.additional || ''
        }),
        validate: validateExamTemplate
    },
    summary: {
        title: getString('template_summary_title'),
        intro: getString('template_summary_intro'),
        submit: getString('template_summary_submit'),
        fields: [
            topicStep('topic', getString('template_summary_topic_label')),
            radioStep('summaryLength', getString('template_summary_length_label'), getString('template_summary_length_hint'), [
                {value: 'short', label: getString('template_summary_length_short')},
                {value: 'medium', label: getString('template_summary_length_medium')},
                {value: 'detailed', label: getString('template_summary_length_detailed')}
            ], 'medium'),
            radioStep('summaryFormat', getString('template_summary_format_label'), getString('template_summary_format_hint'), [
                {value: 'paragraphs', label: getString('template_summary_format_paragraphs')},
                {value: 'bullets', label: getString('template_summary_format_bullets')},
                {value: 'outline', label: getString('template_summary_format_outline')}
            ], 'bullets'),
            radioStep('summaryFocus', getString('template_summary_focus_label'), getString('template_summary_focus_hint'), [
                {value: 'concepts', label: getString('template_summary_focus_concepts')},
                {value: 'study', label: getString('template_summary_focus_study')},
                {value: 'exam', label: getString('template_summary_focus_exam')}
            ], 'study'),
            textareaStep('additional', getString('template_additional_label'), getString('template_additional_optional'))
        ],
        endpoint: 'generate_summary.php',
        userMessage: (values) => `Generar resumen: ${values.topic}`,
        buildPayload: (values, root) => ({
            tema: values.topic,
            extension: mapValue('summaryLength', values.summaryLength),
            formato: mapValue('summaryFormat', values.summaryFormat),
            enfoque: mapValue('summaryFocus', values.summaryFocus),
            indicaciones_adicionales: values.additional || '',
            web_search: isWebSearchEnabled(root)
        }),
        validate: validateSummaryTemplate
    },
    exercise: {
        title: getString('template_exercise_title'),
        intro: getString('template_exercise_intro'),
        submit: getString('template_exercise_submit'),
        fields: [
            topicStep('topic', getString('template_topic_label')),
            radioStep('exerciseType', getString('template_exercise_type_label'), getString('template_exercise_type_hint'), [
                {value: 'guided', label: getString('template_exercise_type_guided')},
                {value: 'case', label: getString('template_exercise_type_case')},
                {value: 'questions', label: getString('template_exercise_type_questions')},
                {value: 'creative', label: getString('template_exercise_type_creative')}
            ], 'guided'),
            radioStep('difficulty', getString('template_difficulty_label'), getString('template_difficulty_hint'), [
                {value: 'basic', label: getString('template_level_basic'), icon: 'book'},
                {value: 'intermediate', label: getString('template_level_intermediate'), icon: 'bars'},
                {value: 'advanced', label: getString('template_level_advanced'), icon: 'rocket'}
            ], 'intermediate'),
            numberGroupStep('exerciseCount', getString('template_exercise_count_label'), getString('template_exercise_count_hint'), [
                {name: 'exerciseCount', value: 3, min: 1, max: 20, suffix: getString('template_exercise_count_suffix')}
            ]),
            radioStep('includeSolution', getString('template_exercise_solution_label'), getString('template_exercise_solution_hint'), [
                {value: 'yes', label: getString('template_yes')},
                {value: 'no', label: getString('template_no')}
            ], 'yes'),
            textareaStep('additional', getString('template_additional_label'), getString('template_additional_optional'))
        ],
        endpoint: 'generate_exercise.php',
        userMessage: (values) => `Generar ejercicio: ${values.topic}`,
        buildPayload: (values) => ({
            tema: values.topic,
            tipo: mapValue('exerciseType', values.exerciseType),
            nivel_dificultad: mapValue('difficulty', values.difficulty),
            apartados: toInt(values.exerciseCount),
            incluir_solucion: values.includeSolution === 'yes',
            indicaciones_adicionales: values.additional || ''
        }),
        validate: validateExerciseTemplate
    }
});

const optionValues = {
    examType: {
        test: 'test',
        open: 'preguntas_abiertas',
        mixed: 'mixto'
    },
    difficulty: {
        basic: 'basico',
        intermediate: 'intermedio',
        advanced: 'avanzado'
    },
    summaryLength: {
        short: 'breve',
        medium: 'medio',
        detailed: 'detallado'
    },
    summaryFormat: {
        paragraphs: 'parrafos',
        bullets: 'puntos_clave',
        outline: 'esquema'
    },
    summaryFocus: {
        concepts: 'conceptos_principales',
        study: 'para_estudiar',
        exam: 'repaso_examen'
    },
    exerciseType: {
        guided: 'practica_guiada',
        case: 'caso_aplicado',
        questions: 'preguntas',
        creative: 'actividad_creativa'
    }
};

const optionLabels = {
    examType: {
        test: () => getString('template_exam_type_test'),
        open: () => getString('template_exam_type_open'),
        mixed: () => getString('template_exam_type_mixed')
    },
    difficulty: {
        basic: () => getString('template_level_basic'),
        intermediate: () => getString('template_level_intermediate'),
        advanced: () => getString('template_level_advanced')
    },
    summaryLength: {
        short: () => getString('template_summary_length_short'),
        medium: () => getString('template_summary_length_medium'),
        detailed: () => getString('template_summary_length_detailed')
    },
    summaryFormat: {
        paragraphs: () => getString('template_summary_format_paragraphs'),
        bullets: () => getString('template_summary_format_bullets'),
        outline: () => getString('template_summary_format_outline')
    },
    summaryFocus: {
        concepts: () => getString('template_summary_focus_concepts'),
        study: () => getString('template_summary_focus_study'),
        exam: () => getString('template_summary_focus_exam')
    },
    exerciseType: {
        guided: () => getString('template_exercise_type_guided'),
        case: () => getString('template_exercise_type_case'),
        questions: () => getString('template_exercise_type_questions'),
        creative: () => getString('template_exercise_type_creative')
    },
    includeSolution: {
        yes: () => getString('template_yes'),
        no: () => getString('template_no')
    }
};

const labelFor = (group, value) => optionLabels[group] && optionLabels[group][value] ? optionLabels[group][value]() : value;

const mapValue = (group, value) => optionValues[group] && optionValues[group][value] ? optionValues[group][value] : value;

const toInt = (value) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getExamQuestionCounts = (values) => {
    const testQuestions = toInt(values.testQuestions);
    const openQuestions = toInt(values.openQuestions);
    if (values.examType === 'test') {
        return {test: testQuestions, open: 0};
    }
    if (values.examType === 'open') {
        return {test: 0, open: openQuestions};
    }
    return {test: testQuestions, open: openQuestions};
};

const isWebSearchEnabled = (root) => {
    const webSearch = root.querySelector('#kika_web_search');
    return webSearch ? webSearch.checked : false;
};

const validateSummaryTemplate = (values) => {
    if (!values.topic || !values.summaryLength || !values.summaryFormat || !values.summaryFocus) {
        return getString('template_required_error');
    }
    return '';
};

const validateExamTemplate = (values) => {
    if (!values.topic || !values.examType || !values.difficulty) {
        return getString('template_required_error');
    }

    const testQuestions = toInt(values.testQuestions);
    const openQuestions = toInt(values.openQuestions);
    if (values.examType === 'test' && testQuestions <= 0) {
        return getString('template_required_error');
    }
    if (values.examType === 'open' && openQuestions <= 0) {
        return getString('template_required_error');
    }
    if (values.examType === 'mixed' && (testQuestions <= 0 || openQuestions <= 0)) {
        return getString('template_required_error');
    }
    return '';
};

const validateExerciseTemplate = (values) => {
    const count = toInt(values.exerciseCount);
    if (!values.topic || !values.exerciseType || !values.difficulty || !values.includeSolution) {
        return getString('template_required_error');
    }
    if (count < 1 || count > 20) {
        return getString('template_required_error');
    }
    return '';
};

const topicStep = (name, label) => ({
    type: 'topic',
    name,
    label,
    hint: getString('template_topic_hint'),
    placeholder: getString('template_topic_placeholder'),
    required: true
});

const textareaStep = (name, label, hint) => ({
    type: 'textarea',
    name,
    label,
    hint,
    placeholder: getString('template_additional_placeholder')
});

const radioStep = (name, label, hint, options, defaultValue) => ({
    type: 'radio',
    name,
    label,
    hint,
    options,
    defaultValue
});

const numberGroupStep = (name, label, hint, controls) => ({
    type: 'numberGroup',
    name,
    label,
    hint,
    controls
});

const openTemplateModal = (templateId, root, trigger) => {
    const config = getTemplateConfigs()[templateId];
    const modal = root.querySelector('#kika_template_modal');
    if (!config || !modal) return;

    activateRoot(root);
    if (modal._kikaCloseCancel) {
        modal._kikaCloseCancel();
        modal._kikaCloseCancel = null;
    }
    if (activeTemplateModal) {
        closeTemplateModal(true);
    }
    renderTemplateModal(modal, config, root, trigger);
    modal.classList.add('is-open');
    modal.classList.add('is-motion-active');
    window.requestAnimationFrame(() => {
        modal.classList.add('is-visible');
        const dialog = modal.querySelector('.kika-template-dialog');
        if (dialog && !prefersReducedMotion()) {
            modal._kikaOpenCancel = afterTransition(dialog, 'transform', 240, () => {
                modal.classList.remove('is-motion-active');
                modal._kikaOpenCancel = null;
            });
        } else {
            modal.classList.remove('is-motion-active');
        }
    });
    modal.setAttribute('aria-hidden', 'false');
    activeTemplateModal = {modal, root, trigger, closeTimer: null};

    const firstInput = modal.querySelector('input[type="text"], textarea, input, button');
    if (firstInput) {
        firstInput.focus();
    }
};

const closeTemplateModal = (immediate = false, restoreFocus = true) => {
    if (!activeTemplateModal) return;
    const currentModal = activeTemplateModal;
    const {modal, trigger} = currentModal;
    if (modal._kikaOpenCancel) {
        modal._kikaOpenCancel();
        modal._kikaOpenCancel = null;
    }
    modal.classList.add('is-motion-active');
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    const dialog = modal.querySelector('.kika-template-dialog');
    if (dialog) dialog.inert = true;
    activeTemplateModal = null;
    if (restoreFocus && trigger && document.contains(trigger)) trigger.focus();
    const finishClose = () => {
        modal._kikaCloseCancel = null;
        modal.classList.remove('is-motion-active');
        modal.classList.remove('is-open');
        modal.innerHTML = '';
    };
    if (immediate || prefersReducedMotion()) {
        finishClose();
    } else {
        modal._kikaCloseCancel = afterTransition(dialog || modal, dialog ? 'transform' : null, 240, finishClose);
    }
};

const renderTemplateModal = (modal, config, root, trigger) => {
    modal.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'kika-template-overlay';
    overlay.addEventListener('click', () => closeTemplateModal());

    const dialog = document.createElement('div');
    dialog.className = 'kika-template-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'kika_template_title');
    dialog.addEventListener('click', (event) => event.stopPropagation());

    const form = document.createElement('form');
    form.className = 'kika-template-form';
    form.noValidate = true;

    const header = document.createElement('div');
    header.className = 'kika-template-header';
    const headerText = document.createElement('div');
    const title = document.createElement('h3');
    title.id = 'kika_template_title';
    title.textContent = config.title;
    const intro = document.createElement('p');
    intro.textContent = config.intro;
    headerText.append(title, intro);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'kika-template-close';
    closeButton.title = getString('template_close');
    closeButton.setAttribute('aria-label', getString('template_close'));
    closeButton.textContent = 'x';
    closeButton.addEventListener('click', () => closeTemplateModal());
    header.append(headerText, closeButton);

    const error = document.createElement('div');
    error.className = 'kika-template-error';
    error.setAttribute('role', 'alert');
    error.hidden = true;

    const steps = document.createElement('div');
    steps.className = 'kika-template-steps';
    config.fields.forEach((field, index) => {
        steps.appendChild(renderTemplateStep(field, index + 1));
    });

    const actions = document.createElement('div');
    actions.className = 'kika-template-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'kika-template-secondary';
    cancel.textContent = getString('template_cancel');
    cancel.addEventListener('click', () => closeTemplateModal());

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'kika-template-submit';
    submit.innerHTML = '<span aria-hidden="true">+</span>';
    submit.appendChild(document.createTextNode(` ${config.submit}`));
    actions.append(cancel, submit);

    const note = document.createElement('div');
    note.className = 'kika-template-note';
    note.textContent = getString('template_security_note');

    form.append(header, error, steps, actions, note);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const values = collectTemplateValues(form);
        const validationError = config.validate ? config.validate(values) : '';
        if (validationError) {
            error.textContent = validationError;
            error.hidden = false;
            const topic = form.querySelector('[name="topic"]');
            if (topic && !values.topic) {
                topic.classList.add('has-error');
                topic.focus();
            }
            return;
        }
        closeTemplateModal(false, false);
        sendTemplateGenerator(config, values, root);
        if (trigger) {
            trigger.blur();
        }
    });

    dialog.appendChild(form);
    modal.append(overlay, dialog);
};

const renderTemplateStep = (field, number) => {
    const step = document.createElement('div');
    step.className = 'kika-template-step';

    const badge = document.createElement('div');
    badge.className = 'kika-template-step-number';
    badge.textContent = number;

    const labelWrap = document.createElement('div');
    labelWrap.className = 'kika-template-step-label';
    const label = document.createElement('label');
    label.textContent = field.label;
    labelWrap.appendChild(label);
    if (field.hint) {
        const hint = document.createElement('span');
        hint.textContent = field.hint;
        labelWrap.appendChild(hint);
    }

    const control = document.createElement('div');
    control.className = 'kika-template-step-control';
    control.appendChild(renderTemplateControl(field));

    step.append(badge, labelWrap, control);
    return step;
};

const renderTemplateControl = (field) => {
    if (field.type === 'topic') {
        const wrap = document.createElement('div');
        const input = document.createElement('input');
        input.type = 'text';
        input.name = field.name;
        input.required = true;
        input.placeholder = field.placeholder;
        input.className = 'kika-template-input';
        input.addEventListener('input', () => input.classList.remove('has-error'));
        const hint = document.createElement('div');
        hint.className = 'kika-template-field-hint';
        hint.textContent = field.hint;
        wrap.append(input, hint);
        return wrap;
    }

    if (field.type === 'textarea') {
        const textarea = document.createElement('textarea');
        textarea.name = field.name;
        textarea.placeholder = field.placeholder;
        textarea.className = 'kika-template-textarea';
        textarea.rows = 3;
        return textarea;
    }

    if (field.type === 'numberGroup') {
        const group = document.createElement('div');
        group.className = 'kika-template-number-group';
        field.controls.forEach((control) => group.appendChild(renderNumberControl(control)));
        return group;
    }

    const group = document.createElement('div');
    group.className = 'kika-template-choice-grid';
    field.options.forEach((option) => {
        const choice = document.createElement('label');
        choice.className = 'kika-template-choice';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = field.name;
        input.value = option.value;
        input.checked = option.value === field.defaultValue;
        if (input.checked) {
            choice.classList.add('is-selected');
        }
        input.addEventListener('change', () => {
            group.querySelectorAll('.kika-template-choice').forEach((item) => item.classList.remove('is-selected'));
            choice.classList.add('is-selected');
        });
        const indicator = document.createElement('span');
        indicator.className = 'kika-template-choice-indicator';
        const icon = document.createElement('span');
        icon.className = `kika-template-choice-icon ${option.icon ? `icon-${option.icon}` : ''}`;
        icon.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.textContent = option.label;
        choice.append(input, indicator, icon, text);
        group.appendChild(choice);
    });
    return group;
};

const renderNumberControl = (control) => {
    const wrap = document.createElement('div');
    wrap.className = 'kika-template-number-wrap';
    const input = document.createElement('input');
    input.type = 'number';
    input.name = control.name;
    input.value = control.value;
    input.min = control.min;
    input.max = control.max;
    input.className = 'kika-template-number';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'kika-template-number-btn';
    minus.textContent = '-';
    minus.addEventListener('click', () => stepNumber(input, -1));

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'kika-template-number-btn';
    plus.textContent = '+';
    plus.addEventListener('click', () => stepNumber(input, 1));

    const suffix = document.createElement('span');
    suffix.className = 'kika-template-number-suffix';
    suffix.textContent = control.suffix;
    wrap.append(input, minus, plus, suffix);
    return wrap;
};

const stepNumber = (input, direction) => {
    const min = Number(input.min || 0);
    const max = Number(input.max || 99);
    const current = Number(input.value || 0);
    input.value = Math.max(min, Math.min(max, current + direction));
};

const collectTemplateValues = (form) => {
    const values = {};
    new FormData(form).forEach((value, key) => {
        values[key] = String(value).trim();
    });
    form.querySelectorAll('input[type="number"]').forEach((input) => {
        values[input.name] = input.value;
    });
    return values;
};

const sendTemplateGenerator = (config, values, root) => {
    activateRoot(root);
    if (state.sending) return;
    const message = config.userMessage(values);
    const payload = config.buildPayload(values, root);
    createGenerator(config.endpoint, payload, message, root);
    const webSearch = root.querySelector('#kika_web_search');
    if (webSearch) {
        webSearch.checked = false;
        updateWebSearchState(root);
    }
    const input = root.querySelector('#openai_input');
    if (input) {
        input.value = '';
        input.style.height = 'auto';
    }
};

document.addEventListener('keydown', (event) => {
    if (!activeTemplateModal) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeTemplateModal();
        return;
    }
    if (event.key === 'Tab') {
        const focusable = Array.from(activeTemplateModal.modal.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter((element) => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});

const refreshConversationList = (loadActive = false, root = document) => {
    activateRoot(root);
    const rootState = state;
    const requestId = ++rootState.conversationListRequestId;
    setConversationStatus('Cargando conversaciones...', root);
    return fetch(apiUrl('conversations.php', {blockId: state.blockId}))
        .then(getJson)
        .then((data) => {
            activateRoot(root);
            if (requestId !== rootState.conversationListRequestId) return;
            state.conversations = data.conversations || [];
            renderConversationList(root);
            setConversationStatus(state.conversations.length ? '' : 'No hay conversaciones todavía.', root);

            if (loadActive && state.persistConvo && state.conversationId) {
                const exists = state.conversations.some((conversation) => conversation.conversation_id === state.conversationId);
                if (exists) {
                    return loadConversation(state.conversationId, root);
                }
                clearActiveConversation();
            }
        })
        .catch((error) => {
            if (requestId !== rootState.conversationListRequestId) return;
            showFrontendError(error, root);
        });
};

const renderConversationList = (root = document) => {
    activateRoot(root);
    const list = root.querySelector('#kika_conversation_list');
    if (!list) return;
    list.innerHTML = '';
    const fragment = document.createDocumentFragment();

    state.conversations.forEach((conversation) => {
        const item = document.createElement('div');
        item.className = `kika-conversation-item${conversation.conversation_id === state.conversationId ? ' active' : ''}`;
        item.dataset.conversationId = conversation.conversation_id;

        const content = document.createElement('button');
        content.className = 'kika-conversation-content';
        content.type = 'button';
        content.dataset.conversationAction = 'open';
        content.dataset.conversationId = conversation.conversation_id;

        const title = document.createElement('span');
        title.className = 'kika-conversation-title';
        title.textContent = conversation.title || 'Nueva conversación';

        const meta = document.createElement('span');
        meta.className = 'kika-conversation-meta';
        meta.textContent = conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleString() : '';
        content.append(title, meta);

        const actions = document.createElement('div');
        actions.className = 'kika-conversation-actions';

        const rename = document.createElement('button');
        rename.type = 'button';
        rename.className = 'kika-conversation-icon-btn';
        rename.title = 'Renombrar';
        rename.setAttribute('aria-label', 'Renombrar conversación');
        rename.dataset.conversationAction = 'rename';
        rename.dataset.conversationId = conversation.conversation_id;
        rename.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'kika-conversation-icon-btn kika-conversation-icon-btn-danger';
        remove.title = 'Borrar';
        remove.setAttribute('aria-label', 'Borrar conversación');
        remove.dataset.conversationAction = 'delete';
        remove.dataset.conversationId = conversation.conversation_id;
        remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

        actions.append(rename, remove);
        item.append(content, actions);
        fragment.appendChild(item);
    });
    list.appendChild(fragment);
};

const setConversationStatus = (message, root = document) => {
    const status = root.querySelector('#kika_conversation_status');
    if (status) {
        status.textContent = message;
    }
};

const showFrontendError = (error, root = document, replaceLoading = false) => {
    const message = getFrontendErrorMessage(error);
    setConversationStatus(message, root);
    if (!replaceLoading || !replaceLoadingMessage('bot error', escapeHtml(message), root)) {
        addToChatLog('bot error', escapeHtml(message), root);
    }
    return message;
};

const getFrontendErrorMessage = (error) => {
    const message = error && error.message ? error.message : errorString;
    const technicalPatterns = [
        /Cannot read properties/i,
        /is not a function/i,
        /undefined/i,
        /null/i
    ];

    if (technicalPatterns.some((pattern) => pattern.test(message))) {
        if (window.console && window.console.error) {
            window.console.error('KIKA frontend error:', error);
        }
        return 'No se pudo completar la acción. Inténtalo de nuevo.';
    }

    return message;
};

const loadConversation = (conversationId, root = document) => {
    activateRoot(root);
    if (!conversationId) return Promise.resolve();
    if (state.conversationLoadController) {
        state.conversationLoadController.abort();
    }
    const controller = new AbortController();
    state.conversationLoadController = controller;
    setConversationStatus('Cargando mensajes...', root);
    return fetch(apiUrl('conversation_messages.php', {blockId: state.blockId, conversation_id: conversationId}), {
        signal: controller.signal
    })
        .then(getJson)
        .then((data) => {
            activateRoot(root);
            if (state.conversationLoadController !== controller) return;
            state.conversationId = data.conversation_id;
            persistActiveConversation();
            renderChatHistory(data.messages || [], root);
            if ((data.messages || []).length > 0) {
                hideWelcome(true, root);
            } else {
                showWelcome(root);
            }
            setConversationStatus('', root);
            renderConversationList(root);
        })
        .catch((error) => {
            if (error.name === 'AbortError') return;
            showFrontendError(error, root);
        })
        .finally(() => {
            activateRoot(root);
            if (state.conversationLoadController === controller) {
                state.conversationLoadController = null;
            }
        });
};

const startNewConversation = (root = document) => {
    activateRoot(root);
    if (state.creatingConversation) return state.createConversationPromise || Promise.resolve();

    return createRemoteConversation(root, {forceNew: true, resetChat: true, focusInput: true})
        .catch((error) => showFrontendError(error, root));
};

const createRemoteConversation = (root = document, options = {}) => {
    activateRoot(root);
    if (state.conversationId && !options.forceNew) {
        return Promise.resolve({conversation_id: state.conversationId});
    }
    if (state.creatingConversation && state.createConversationPromise) {
        return state.createConversationPromise;
    }

    const resetChat = !!options.resetChat;
    const focusInput = !!options.focusInput;
    state.creatingConversation = true;
    setConversationStatus('Creando conversación…', root);

    state.createConversationPromise = fetch(apiUrl('conversations.php'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({blockId: state.blockId})
    })
        .then(getJson)
        .then((conversation) => {
            activateRoot(root);
            if (!conversation.conversation_id) {
                throw new Error('KIKA_API did not create a conversation.');
            }
            state.conversationId = conversation.conversation_id;
            persistActiveConversation();
            if (resetChat) {
                root.querySelector('#kika_chat_log').innerHTML = '';
                resetChatScroll(root);
                showWelcome(root);
            }
            state.conversations = [
                conversation,
                ...state.conversations.filter((item) => item.conversation_id !== conversation.conversation_id)
            ];
            renderConversationList(root);
            setConversationStatus('', root);
            return conversation;
        })
        .then((conversation) => {
            activateRoot(root);
            const input = root.querySelector('#openai_input');
            if (focusInput && input) {
                input.focus();
            }
            return conversation;
        })
        .finally(() => {
            activateRoot(root);
            state.creatingConversation = false;
            state.createConversationPromise = null;
        });

    return state.createConversationPromise;
};

const resetLocalConversation = (root = document) => {
    activateRoot(root);
    if (state.conversationLoadController) {
        state.conversationLoadController.abort();
        state.conversationLoadController = null;
    }
    clearActiveConversation();
    setConversationStatus('', root);
    root.querySelector('#kika_chat_log').innerHTML = '';
    resetChatScroll(root);
    showWelcome(root);
    renderConversationList(root);
    const input = root.querySelector('#openai_input');
    if (input) {
        input.focus();
    }
};

const clearActiveConversation = () => {
    state.conversationId = null;
    localStorage.removeItem(storageKey());
};

const persistActiveConversation = () => {
    if (state.persistConvo && state.conversationId) {
        localStorage.setItem(storageKey(), state.conversationId);
    }
};

const renameConversation = (conversation, root = document) => {
    activateRoot(root);
    const title = window.prompt('Nuevo título', conversation.title || '');
    if (title === null || title.trim() === '') return;

    fetch(apiUrl('conversation.php'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            action: 'rename',
            blockId: state.blockId,
            conversation_id: conversation.conversation_id,
            title: title.trim()
        })
    })
        .then(getJson)
        .then(() => refreshConversationList(false, root))
        .catch((error) => showFrontendError(error, root));
};

const deleteConversation = (conversation, root = document) => {
    activateRoot(root);
    if (!window.confirm('¿Quieres borrar esta conversación?')) return;

    fetch(apiUrl('conversation.php'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            action: 'delete',
            blockId: state.blockId,
            conversation_id: conversation.conversation_id
        })
    })
        .then(getJson)
        .then(() => {
            if (conversation.conversation_id === state.conversationId) {
                resetLocalConversation(root);
            }
            return refreshConversationList(false, root);
        })
        .catch((error) => showFrontendError(error, root));
};

const CHAT_END_THRESHOLD = 64;
const CHAT_SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

const getChatScrollController = (root = document) => {
    activateRoot(root);
    return state.scrollController;
};

const getChatEnd = (container) => Math.max(0, container.scrollHeight - container.clientHeight);

const isNearChatEnd = (container) => getChatEnd(container) - container.scrollTop <= CHAT_END_THRESHOLD;

const updateChatScrollUi = (root = document) => {
    const controller = getChatScrollController(root);
    if (!controller) return;
    const {container, button} = controller;
    controller.isAtBottom = isNearChatEnd(container);
    controller.lastScrollTop = container.scrollTop;
    if (controller.isAtBottom) {
        controller.followMode = true;
        controller.hasNewContent = false;
    }
    if (!button) return;
    const visible = !controller.isAtBottom;
    button.classList.toggle('is-visible', visible);
    button.classList.toggle('has-new-content', controller.hasNewContent);
    button.setAttribute('aria-hidden', visible ? 'false' : 'true');
    button.setAttribute('tabindex', visible ? '0' : '-1');
    button.setAttribute('aria-label', controller.hasNewContent
        ? 'Ir al último mensaje, hay contenido nuevo'
        : 'Ir al último mensaje');
};

const scheduleChatScrollUi = (root = document) => {
    const controller = getChatScrollController(root);
    if (!controller || controller.uiFrame) return;
    controller.uiFrame = window.requestAnimationFrame(() => {
        controller.uiFrame = null;
        updateChatScrollUi(root);
    });
};

const cancelChatScroll = (root = document, userInitiated = false) => {
    const controller = getChatScrollController(root);
    if (!controller) return;
    if (controller.animationFrame) {
        window.cancelAnimationFrame(controller.animationFrame);
        controller.animationFrame = null;
    }
    if (userInitiated) controller.followMode = false;
    scheduleChatScrollUi(root);
};

const scrollChatToEnd = (root = document, smooth = true, callback = null) => {
    const controller = getChatScrollController(root);
    if (!controller) {
        if (callback) callback();
        return;
    }
    const {container} = controller;
    cancelChatScroll(root);
    controller.followMode = true;
    controller.hasNewContent = false;
    const startTop = container.scrollTop;
    const initialDistance = Math.abs(getChatEnd(container) - startTop);

    if (!smooth || prefersReducedMotion() || initialDistance < 2) {
        container.scrollTop = getChatEnd(container);
        updateChatScrollUi(root);
        if (callback) callback();
        return;
    }

    const duration = Math.min(420, Math.max(180, 180 + initialDistance * 0.18));
    const startTime = performance.now();
    const step = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const destination = getChatEnd(container);
        container.scrollTop = startTop + (destination - startTop) * eased;
        if (progress < 1 && controller.followMode) {
            controller.animationFrame = window.requestAnimationFrame(step);
            return;
        }
        controller.animationFrame = null;
        if (controller.followMode) container.scrollTop = getChatEnd(container);
        updateChatScrollUi(root);
        if (callback) callback();
    };
    controller.animationFrame = window.requestAnimationFrame(step);
};

const resetChatScroll = (root = document) => {
    const controller = getChatScrollController(root);
    if (!controller) return;
    cancelChatScroll(root);
    controller.followMode = true;
    controller.hasNewContent = false;
    controller.container.scrollTop = 0;
    updateChatScrollUi(root);
};

const initChatScroll = (root = document) => {
    activateRoot(root);
    const container = root.querySelector('#kika_chat_log');
    if (!container || state.scrollController) return;
    const controller = {
        container,
        button: root.querySelector('#kika_scroll_to_bottom'),
        isAtBottom: true,
        followMode: true,
        hasNewContent: false,
        animationFrame: null,
        uiFrame: null,
        resizeFrame: null,
        resizeObserver: null,
        mutationObserver: null,
        lastScrollTop: container.scrollTop
    };
    state.scrollController = controller;

    container.addEventListener('scroll', () => scheduleChatScrollUi(root), {passive: true});
    const stopFollowing = () => cancelChatScroll(root, true);
    container.addEventListener('wheel', (event) => {
        if (event.deltaY < 0 || !isNearChatEnd(container)) stopFollowing();
    }, {passive: true});
    container.addEventListener('touchmove', stopFollowing, {passive: true});
    container.addEventListener('pointerdown', (event) => {
        const bounds = container.getBoundingClientRect();
        if (event.clientX >= bounds.right - 18) stopFollowing();
    }, {passive: true});
    container.addEventListener('keydown', (event) => {
        if (!CHAT_SCROLL_KEYS.has(event.key)) return;
        const movesUp = event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'Home' ||
            (event.key === ' ' && event.shiftKey);
        if (movesUp || !isNearChatEnd(container)) stopFollowing();
    });

    if (controller.button) {
        controller.button.addEventListener('click', () => scrollChatToEnd(root, true));
    }

    if (window.ResizeObserver) {
        controller.resizeObserver = new ResizeObserver(() => {
            if (controller.resizeFrame || !controller.followMode || controller.animationFrame) return;
            controller.resizeFrame = window.requestAnimationFrame(() => {
                controller.resizeFrame = null;
                if (controller.followMode) scrollChatToEnd(root, false);
            });
        });
        container.querySelectorAll('.openai_message').forEach((message) => controller.resizeObserver.observe(message));
    }
    if (window.MutationObserver) {
        controller.mutationObserver = new MutationObserver((mutations) => {
            if (controller.resizeObserver) {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.matches('.openai_message')) {
                            controller.resizeObserver.unobserve(node);
                        }
                    });
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.matches('.openai_message')) {
                            controller.resizeObserver.observe(node);
                        }
                    });
                });
            }
            scheduleChatScrollUi(root);
        });
        controller.mutationObserver.observe(container, {childList: true});
    }
    updateChatScrollUi(root);
};

const addToChatLog = (type, message, root = document, metadata = {}, options = {}) => {
    hideWelcome(true, root);
    const messageContainer = root.querySelector('#kika_chat_log');
    if (!messageContainer) return;

    const controller = getChatScrollController(root);
    const shouldFollow = options.forceFollow || !controller || controller.followMode;
    messageContainer.appendChild(buildMessageElement(type, message, metadata));
    if (shouldFollow) {
        scrollChatToEnd(root, !prefersReducedMotion());
    } else if (controller) {
        controller.hasNewContent = true;
        updateChatScrollUi(root);
    }
};

const replaceLoadingMessage = (type, message, root = document, metadata = {}) => {
    const messageContainer = root.querySelector('#kika_chat_log');
    if (!messageContainer) return false;
    const loading = messageContainer.querySelector('.openai_message.loading');
    if (!loading) return false;
    const controller = getChatScrollController(root);
    const shouldFollow = !controller || controller.followMode;
    loading.replaceWith(buildMessageElement(type, message, metadata));
    if (shouldFollow) {
        scrollChatToEnd(root, !prefersReducedMotion());
    } else if (controller) {
        controller.hasNewContent = true;
        updateChatScrollUi(root);
    }
    return true;
};

const renderChatHistory = (messages, root = document) => {
    activateRoot(root);
    const messageContainer = root.querySelector('#kika_chat_log');
    if (!messageContainer) return;
    const fragment = document.createDocumentFragment();
    messages.forEach((message) => {
        if (!message.message) return;
        const type = message.role === 'user' ? 'user' : 'bot';
        fragment.appendChild(buildMessageElement(type, message.message, message, false));
    });
    messageContainer.classList.add('restoring-history');
    messageContainer.replaceChildren(fragment);
    setChatHasMessages(messageContainer.childElementCount > 0, root);
    scrollChatToEnd(root, false, () => messageContainer.classList.remove('restoring-history'));
};

const buildMessageElement = (type, message, metadata = {}, animate = true) => {
    const messageElem = document.createElement('div');
    messageElem.classList.add('openai_message');
    if (!animate) messageElem.classList.add('no-enter-motion');
    for (const className of type.split(' ')) {
        messageElem.classList.add(className);
    }

    if (type.includes('loading')) {
        const bubble = document.createElement('div');
        bubble.classList.add('openai-message-bubble');
        bubble.setAttribute('role', 'status');
        bubble.setAttribute('aria-label', 'Generando respuesta');
        const loader = document.createElement('div');
        loader.classList.add('openai-loading-dots');
        loader.setAttribute('aria-hidden', 'true');
        loader.innerHTML = '<span></span><span></span><span></span>';
        bubble.appendChild(loader);
        messageElem.appendChild(bubble);
    } else if (type.includes('bot')) {
        const headerElem = document.createElement('div');
        headerElem.classList.add('openai-message-bot-header');
        headerElem.innerHTML = `
            <div class="openai-message-bot-avatar-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sparkle-svg">
                    <path d="M12 3c0 4.5 3.5 8 8 8-4.5 0-8 3.5-8 8 0-4.5-3.5-8-8-8 4.5 0 8-3.5 8-8z" fill="currentColor"/>
                </svg>
            </div>
            <span class="openai-message-bot-name">${escapeHtml(window.assistantName || 'Kika')}</span>
        `;
        messageElem.appendChild(headerElem);
        appendBubble(messageElem, message);
        appendWebSearchMetadata(messageElem, metadata);
    } else {
        appendBubble(messageElem, message);
    }
    return messageElem;
};

const appendWebSearchMetadata = (messageElem, metadata) => {
    if (!metadata.web_search_used && !(metadata.sources || []).length) return;

    const info = document.createElement('div');
    info.className = 'kika-web-search-info';
    if (metadata.web_search_used) {
        const label = document.createElement('div');
        label.textContent = 'Respuesta con búsqueda web';
        info.appendChild(label);
    }

    (metadata.sources || []).forEach((source) => {
        const link = document.createElement('a');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = source.title || source.url;
        if (source.date) {
            link.textContent += ` (${source.date})`;
        }
        info.appendChild(link);
    });
    messageElem.appendChild(info);
};

const appendBubble = (messageElem, message) => {
    const bubble = document.createElement('div');
    bubble.classList.add('openai-message-bubble');
    bubble.innerHTML = message;
    messageElem.appendChild(bubble);
};

const setSendingState = (sending, root = document) => {
    activateRoot(root);
    state.sending = sending;
    const controlBar = root.querySelector('#control_bar');
    const wrapper = root.querySelector('.openai-chat-wrapper');
    const sendButton = root.querySelector('#go');
    if (controlBar) {
        controlBar.classList.toggle('disabled', sending);
        controlBar.setAttribute('aria-busy', sending ? 'true' : 'false');
    }
    if (wrapper) wrapper.setAttribute('aria-busy', sending ? 'true' : 'false');
    if (sendButton) sendButton.disabled = sending;
};

const createCompletion = (message, webSearch = false, root = document) => {
    activateRoot(root);
    if (state.sending) return;
    setSendingState(true, root);
    const input = root.querySelector('#openai_input');
    if (input) {
        input.classList.remove('error');
    }
    if (input) {
        input.placeholder = questionString;
        input.blur();
    }
    addToChatLog('bot loading', '', root);

    fetch(apiUrl('completion.php'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            message: message,
            blockId: state.blockId,
            conversationId: state.conversationId,
            web_search: webSearch
        })
    })
        .then(getJson)
        .then((data) => {
            activateRoot(root);
            state.conversationId = data.conversation_id;
            persistActiveConversation();
            if (data.message) {
                replaceLoadingMessage('bot', data.message, root, data);
            } else {
                showFrontendError(new Error('La respuesta recibida está vacía.'), root, true);
            }
            refreshConversationList(false, root);
            setSendingState(false, root);
            if (input) {
                input.focus();
            }
        })
        .catch((error) => {
            activateRoot(root);
            setSendingState(false, root);
            const errorMessage = showFrontendError(error, root, true);
            if (input) {
                input.classList.add('error');
                input.placeholder = errorMessage;
                if (input.value.trim() === '') {
                    input.value = message;
                    scheduleTextareaResize(input, root);
                }
            }
        });
};

const createGenerator = (endpoint, payload, userMessage, root = document) => {
    activateRoot(root);
    if (state.sending) return;

    setSendingState(true, root);
    const input = root.querySelector('#openai_input');
    if (input) {
        input.classList.remove('error');
        input.placeholder = questionString;
        input.blur();
    }

    createRemoteConversation(root)
        .then((conversation) => {
            activateRoot(root);
            const conversationId = conversation.conversation_id || state.conversationId;
            if (!conversationId) {
                throw new Error('No se pudo crear una conversación para generar contenido.');
            }
            state.conversationId = conversationId;
            persistActiveConversation();
            addToChatLog('user', escapeHtml(userMessage), root, {}, {forceFollow: true});
            addToChatLog('bot loading', '', root);
            return fetch(apiUrl(endpoint), {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...payload,
                    blockId: state.blockId,
                    conversation_id: conversationId
                })
            });
        })
        .then((response) => {
            return getJson(response);
        })
        .then((data) => {
            activateRoot(root);
            state.conversationId = data.conversation_id || state.conversationId;
            persistActiveConversation();
            const answer = data.respuesta || data.message || '';
            if (answer) {
                replaceLoadingMessage('bot', answer, root, data);
            } else {
                showFrontendError(new Error('La respuesta recibida está vacía.'), root, true);
            }
            refreshConversationList(false, root);
            if (input) {
                input.focus();
            }
        })
        .catch((error) => {
            activateRoot(root);
            const errorMessage = showFrontendError(error, root, true);
            if (input) {
                input.classList.add('error');
                input.placeholder = errorMessage;
                if (input.value.trim() === '') {
                    input.value = userMessage;
                    scheduleTextareaResize(input, root);
                }
            }
        })
        .finally(() => {
            activateRoot(root);
            setSendingState(false, root);
        });
};

const escapeHtml = (value) => {
    const span = document.createElement('span');
    span.textContent = value;
    return span.innerHTML;
};
