var questionString = 'Ask a question...';
var errorString = 'An error occurred! Please try again later.';
const uiStrings = {};
const templateFallbackStrings = {
    quick_create_exam: 'Crear examen',
    quick_create_summary: 'Crear resumen',
    quick_create_exercise: 'Crear Ejercicio',
    template_close: 'Cerrar',
    template_cancel: 'Cancelar',
    template_required_error: 'Completa el tema para continuar.',
    template_security_note: 'Tu contenido estara listo en segundos.',
    template_topic_label: 'De que tema?',
    template_topic_hint: 'Ejemplo: La fotosintesis, La Revolucion Francesa, Ecuaciones de primer grado, etc.',
    template_topic_placeholder: 'La fotosintesis',
    template_additional_label: 'Indicaciones adicionales',
    template_additional_optional: 'Opcional',
    template_additional_placeholder: 'Ej.: Enfocar en conceptos clave vistos en clase.',
    template_difficulty_label: 'Nivel de dificultad',
    template_difficulty_hint: 'Selecciona el nivel adecuado.',
    template_level_basic: 'Basico',
    template_level_intermediate: 'Intermedio',
    template_level_advanced: 'Avanzado',
    template_exam_title: 'Generar examen',
    template_exam_intro: 'Responde estos simples pasos y crearemos el examen ideal para tu clase.',
    template_exam_type_label: 'Tipo de examen',
    template_exam_type_hint: 'Elige el formato que prefieras.',
    template_exam_type_test: 'Tipo test',
    template_exam_type_open: 'Preguntas abiertas',
    template_exam_type_mixed: 'Mixto',
    template_exam_questions_label: 'Cuantas preguntas?',
    template_exam_questions_hint: 'Configura la cantidad por tipo.',
    template_exam_test_suffix: 'test',
    template_exam_open_suffix: 'abiertas',
    template_exam_submit: 'Generar examen',
    template_summary_title: 'Generar resumen',
    template_summary_intro: 'Configura el resumen que necesitas para estudiar o repasar.',
    template_summary_topic_label: 'Que tema o unidad?',
    template_summary_length_label: 'Extension',
    template_summary_length_hint: 'Define la profundidad del resumen.',
    template_summary_length_short: 'Breve',
    template_summary_length_medium: 'Media',
    template_summary_length_detailed: 'Detallada',
    template_summary_format_label: 'Formato',
    template_summary_format_hint: 'Elige como quieres leerlo.',
    template_summary_format_paragraphs: 'Parrafos',
    template_summary_format_bullets: 'Puntos clave',
    template_summary_format_outline: 'Esquema',
    template_summary_focus_label: 'Enfoque',
    template_summary_focus_hint: 'Selecciona el objetivo principal.',
    template_summary_focus_concepts: 'Conceptos principales',
    template_summary_focus_study: 'Para estudiar',
    template_summary_focus_exam: 'Para repasar antes de examen',
    template_summary_submit: 'Generar resumen',
    template_exercise_title: 'Generar ejercicio',
    template_exercise_intro: 'Define la practica que quieres crear para este curso.',
    template_exercise_type_label: 'Tipo de ejercicio',
    template_exercise_type_hint: 'Elige la actividad que necesitas.',
    template_exercise_type_guided: 'Practica guiada',
    template_exercise_type_case: 'Caso aplicado',
    template_exercise_type_questions: 'Preguntas',
    template_exercise_type_creative: 'Actividad creativa',
    template_exercise_count_label: 'Cuantos apartados?',
    template_exercise_count_hint: 'Configura la cantidad de ejercicios o partes.',
    template_exercise_count_suffix: 'apartados',
    template_exercise_solution_label: 'Incluir solucion',
    template_exercise_solution_hint: 'Indica si quieres solucion o respuestas esperadas.',
    template_yes: 'Si',
    template_no: 'No'
};
let activeTemplateModal = null;

let state = {
    blockId: null,
    courseId: null,
    userId: null,
    persistConvo: true,
    conversationId: null,
    conversations: [],
    sending: false,
    creatingConversation: false
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

const hideWelcome = (immediate = false, root = document) => {
    const welcomeMsg = root.querySelector("#welcome-message");
    if (!welcomeMsg) return;

    welcomeMsg.classList.add("hidden-welcome");
    welcomeMsg.style.opacity = "0";
    welcomeMsg.style.pointerEvents = "none";

    if (immediate) {
        welcomeMsg.classList.add("d-none");
        welcomeMsg.style.setProperty("display", "none", "important");
    } else {
        welcomeMsg.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        welcomeMsg.style.transform = "translateY(-10px)";
        setTimeout(() => {
            welcomeMsg.classList.add("d-none");
            welcomeMsg.style.setProperty("display", "none", "important");
        }, 300);
    }
};

const showWelcome = (root = document) => {
    const welcomeMsg = root.querySelector("#welcome-message");
    if (!welcomeMsg) return;
    welcomeMsg.classList.remove("hidden-welcome", "d-none");
    welcomeMsg.style.removeProperty("display");
    welcomeMsg.style.removeProperty("opacity");
    welcomeMsg.style.removeProperty("transform");
    welcomeMsg.style.removeProperty("pointer-events");
    welcomeMsg.style.removeProperty("transition");
};

export const init = (data) => {
    const root = getBlockRoot(data.blockId);
    state = {
        blockId: data.blockId,
        courseId: data.courseId,
        userId: data.userId,
        persistConvo: data.persistConvo === "1",
        conversationId: null,
        conversations: [],
        sending: false,
        creatingConversation: false
    };
    statesByRoot.set(root, state);

    if (state.persistConvo) {
        state.conversationId = localStorage.getItem(storageKey());
    }

    window.addEventListener('resize', event => {
        event.stopImmediatePropagation();
    }, true);

    bindInputHandlers(root);
    bindHeaderHandlers(root);
    initButtonHandlers(root);
    loadStrings();
    refreshConversationList(true, root);
};

const bindInputHandlers = (root) => {
    const inputField = root.querySelector('#openai_input');
    const sendButton = root.querySelector('#go');

    if (inputField) {
        inputField.addEventListener('input', () => {
            inputField.style.height = 'auto';
            inputField.style.height = Math.min(inputField.scrollHeight, 120) + 'px';
        });

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

    const popoutBtn = root.querySelector('#popout');
    if (popoutBtn) {
        popoutBtn.addEventListener('click', () => {
            if (document.querySelector('.drawer.drawer-right')) {
                document.querySelector('.drawer.drawer-right').style.zIndex = '1041';
            }
            const block = root.closest('.block_kika_chat') || root;
            if (block) {
                block.classList.toggle('expanded');
            }
        });
    }
};

const setConversationPanelOpen = (open, root = document) => {
    const wrapper = root.querySelector('.openai-chat-wrapper');
    const panel = root.querySelector('#kika_conversation_panel');
    const toggleBtn = root.querySelector('#conversation-toggle');

    if (wrapper) {
        wrapper.classList.toggle('conversation-panel-open', open);
    }
    if (panel) {
        panel.hidden = !open;
    }
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggleBtn.classList.toggle('active', open);
    }
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
    addToChatLog('user', escapeHtml(value), root);
    createCompletion(value, useWebSearch, root);
    inputField.value = '';
    inputField.style.height = 'auto';
    if (webSearch) {
        webSearch.checked = false;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const initButtonHandlers = (root) => {
    root.querySelectorAll('[data-kika-template]').forEach((button) => {
        button.addEventListener('click', () => openTemplateModal(button.dataset.kikaTemplate, root, button));
    });
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
        buildPrompt: (values) => [
            'Quiero que generes un examen para este curso con la siguiente configuracion:',
            `- Tema: ${quoted(values.topic)}`,
            `- Tipo de examen: ${quoted(labelFor('examType', values.examType))}`,
            `- Preguntas tipo test: ${quoted(values.testQuestions)}`,
            `- Preguntas abiertas: ${quoted(values.openQuestions)}`,
            `- Nivel de dificultad: ${quoted(labelFor('difficulty', values.difficulty))}`,
            values.additional ? `- Indicaciones adicionales: ${quoted(values.additional)}` : '',
            'Devuelve el examen listo para usar en clase, con instrucciones claras y respuestas o criterios de correccion cuando corresponda.'
        ].filter(Boolean).join('\n')
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
        buildPrompt: (values) => [
            'Quiero que generes un resumen para este curso con la siguiente configuracion:',
            `- Tema o unidad: ${quoted(values.topic)}`,
            `- Extension: ${quoted(labelFor('summaryLength', values.summaryLength))}`,
            `- Formato: ${quoted(labelFor('summaryFormat', values.summaryFormat))}`,
            `- Enfoque: ${quoted(labelFor('summaryFocus', values.summaryFocus))}`,
            values.additional ? `- Indicaciones adicionales: ${quoted(values.additional)}` : '',
            'Organiza el resultado para que sea facil de estudiar, con titulos claros y contenido fiel al tema.'
        ].filter(Boolean).join('\n')
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
        buildPrompt: (values) => [
            'Quiero que generes un ejercicio para este curso con la siguiente configuracion:',
            `- Tema: ${quoted(values.topic)}`,
            `- Tipo de ejercicio: ${quoted(labelFor('exerciseType', values.exerciseType))}`,
            `- Nivel de dificultad: ${quoted(labelFor('difficulty', values.difficulty))}`,
            `- Cantidad de ejercicios o apartados: ${quoted(values.exerciseCount)}`,
            `- Incluir solucion: ${quoted(labelFor('includeSolution', values.includeSolution))}`,
            values.additional ? `- Indicaciones adicionales: ${quoted(values.additional)}` : '',
            'Devuelve la actividad lista para usar con el alumnado, con instrucciones claras y formato ordenado.'
        ].filter(Boolean).join('\n')
    }
});

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

const quoted = (value) => `"${String(value || '').trim()}"`;

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
    renderTemplateModal(modal, config, root, trigger);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    activeTemplateModal = {modal, root, trigger};

    const firstInput = modal.querySelector('input[type="text"], textarea, input, button');
    if (firstInput) {
        firstInput.focus();
    }
};

const closeTemplateModal = () => {
    if (!activeTemplateModal) return;
    const {modal, trigger} = activeTemplateModal;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = '';
    activeTemplateModal = null;
    if (trigger) {
        trigger.focus();
    }
};

const renderTemplateModal = (modal, config, root, trigger) => {
    modal.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'kika-template-overlay';
    overlay.addEventListener('click', closeTemplateModal);

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
    closeButton.addEventListener('click', closeTemplateModal);
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
    cancel.addEventListener('click', closeTemplateModal);

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
        if (!values.topic) {
            error.textContent = getString('template_required_error');
            error.hidden = false;
            const topic = form.querySelector('[name="topic"]');
            if (topic) {
                topic.classList.add('has-error');
                topic.focus();
            }
            return;
        }
        closeTemplateModal();
        sendTemplatePrompt(config.buildPrompt(values), root);
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

const sendTemplatePrompt = (message, root) => {
    activateRoot(root);
    if (state.sending) return;
    addToChatLog('user', escapeHtml(message), root);
    createCompletion(message, false, root);
    const input = root.querySelector('#openai_input');
    if (input) {
        input.value = '';
        input.style.height = 'auto';
    }
};

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeTemplateModal) {
        closeTemplateModal();
    }
});

const refreshConversationList = (loadActive = false, root = document) => {
    activateRoot(root);
    setConversationStatus('Cargando conversaciones...', root);
    fetch(apiUrl('conversations.php', {blockId: state.blockId}))
        .then(getJson)
        .then((data) => {
            activateRoot(root);
            state.conversations = data.conversations || [];
            renderConversationList(root);
            setConversationStatus(state.conversations.length ? '' : 'No hay conversaciones todavia.', root);

            if (loadActive && state.persistConvo && state.conversationId) {
                const exists = state.conversations.some((conversation) => conversation.conversation_id === state.conversationId);
                if (exists) {
                    return loadConversation(state.conversationId, root);
                }
                clearActiveConversation();
            }
        })
        .catch((error) => showFrontendError(error, root));
};

const renderConversationList = (root = document) => {
    activateRoot(root);
    const list = root.querySelector('#kika_conversation_list');
    if (!list) return;
    list.innerHTML = '';

    state.conversations.forEach((conversation) => {
        const item = document.createElement('div');
        item.className = `kika-conversation-item${conversation.conversation_id === state.conversationId ? ' active' : ''}`;
        item.dataset.conversationId = conversation.conversation_id;

        const content = document.createElement('button');
        content.className = 'kika-conversation-content';
        content.type = 'button';
        content.addEventListener('click', () => loadConversation(conversation.conversation_id, root));

        const title = document.createElement('span');
        title.className = 'kika-conversation-title';
        title.textContent = conversation.title || 'Nueva conversacion';

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
        rename.setAttribute('aria-label', 'Renombrar conversacion');
        rename.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
        rename.addEventListener('click', () => renameConversation(conversation, root));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'kika-conversation-icon-btn kika-conversation-icon-btn-danger';
        remove.title = 'Borrar';
        remove.setAttribute('aria-label', 'Borrar conversacion');
        remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
        remove.addEventListener('click', () => deleteConversation(conversation, root));

        actions.append(rename, remove);
        item.append(content, actions);
        list.appendChild(item);
    });
};

const setConversationStatus = (message, root = document) => {
    const status = root.querySelector('#kika_conversation_status');
    if (status) {
        status.textContent = message;
    }
};

const showFrontendError = (error, root = document) => {
    const message = error && error.message ? error.message : errorString;
    setConversationStatus(message, root);
    addToChatLog('bot error', escapeHtml(message), root);
    return message;
};

const loadConversation = (conversationId, root = document) => {
    activateRoot(root);
    if (!conversationId) return Promise.resolve();
    setConversationStatus('Cargando mensajes...', root);
    return fetch(apiUrl('conversation_messages.php', {blockId: state.blockId, conversation_id: conversationId}))
        .then(getJson)
        .then((data) => {
            activateRoot(root);
            state.conversationId = data.conversation_id;
            persistActiveConversation();
            root.querySelector('#kika_chat_log').innerHTML = '';
            (data.messages || []).forEach((message) => {
                if (!message.message) {
                    return;
                }
                addToChatLog(message.role === 'user' ? 'user' : 'bot', message.message, root, message);
            });
            if ((data.messages || []).length > 0) {
                hideWelcome(true, root);
            } else {
                showWelcome(root);
            }
            setConversationStatus('', root);
            renderConversationList(root);
        })
        .catch((error) => showFrontendError(error, root));
};

const startNewConversation = (root = document) => {
    activateRoot(root);
    if (state.creatingConversation) return;

    state.creatingConversation = true;
    setConversationStatus('Creando conversacion...', root);

    fetch(apiUrl('conversations.php'), {
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
            root.querySelector('#kika_chat_log').innerHTML = '';
            showWelcome(root);
            state.conversations = [
                conversation,
                ...state.conversations.filter((item) => item.conversation_id !== conversation.conversation_id)
            ];
            renderConversationList(root);
            setConversationStatus('', root);
            return refreshConversationList(false, root);
        })
        .then(() => {
            const input = root.querySelector('#openai_input');
            if (input) {
                input.focus();
            }
        })
        .catch((error) => showFrontendError(error, root))
        .finally(() => {
            state.creatingConversation = false;
        });
};

const resetLocalConversation = (root = document) => {
    clearActiveConversation();
    root.querySelector('#kika_chat_log').innerHTML = '';
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
    const title = window.prompt('Nuevo titulo', conversation.title || '');
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
    if (!window.confirm('Borrar esta conversacion?')) return;

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

const addToChatLog = (type, message, root = document, metadata = {}) => {
    hideWelcome(true, root);
    let messageContainer = root.querySelector('#kika_chat_log');
    if (!messageContainer) return;

    const messageElem = document.createElement('div');
    messageElem.classList.add('openai_message');
    for (let className of type.split(' ')) {
        messageElem.classList.add(className);
    }

    if (type.includes('loading')) {
        const bubble = document.createElement('div');
        bubble.classList.add('openai-message-bubble');
        const loader = document.createElement('div');
        loader.classList.add('openai-loading-dots');
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

    messageContainer.appendChild(messageElem);
    messageContainer.scrollTop = messageContainer.scrollHeight;
};

const appendWebSearchMetadata = (messageElem, metadata) => {
    if (!metadata.web_search_used && !(metadata.sources || []).length) return;

    const info = document.createElement('div');
    info.className = 'kika-web-search-info';
    if (metadata.web_search_used) {
        const label = document.createElement('div');
        label.textContent = 'Respuesta con busqueda web';
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

const createCompletion = (message, webSearch = false, root = document) => {
    activateRoot(root);
    if (state.sending) return;
    state.sending = true;
    const controlBar = root.querySelector('#control_bar');
    const input = root.querySelector('#openai_input');
    if (controlBar) {
        controlBar.classList.add('disabled');
    }
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
        .then((response) => {
            removeLoadingMessage(root);
            if (controlBar) {
                controlBar.classList.remove('disabled');
            }
            state.sending = false;
            return getJson(response);
        })
        .then((data) => {
            activateRoot(root);
            state.conversationId = data.conversation_id;
            persistActiveConversation();
            if (data.message) {
                addToChatLog('bot', data.message, root, data);
            } else {
                showFrontendError(new Error('La respuesta recibida esta vacia.'), root);
            }
            refreshConversationList(false, root);
            if (input) {
                input.focus();
            }
        })
        .catch((error) => {
            removeLoadingMessage(root);
            if (controlBar) {
                controlBar.classList.remove('disabled');
            }
            state.sending = false;
            const errorMessage = showFrontendError(error, root);
            if (input) {
                input.classList.add('error');
                input.placeholder = errorMessage;
                if (input.value.trim() === '') {
                    input.value = message;
                    input.style.height = 'auto';
                    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
                }
            }
        });
};

const removeLoadingMessage = (root = document) => {
    let messageContainer = root.querySelector('#kika_chat_log');
    if (messageContainer) {
        messageContainer.querySelectorAll('.openai_message.loading').forEach((message) => message.remove());
    }
};

const escapeHtml = (value) => {
    const span = document.createElement('span');
    span.textContent = value;
    return span.innerHTML;
};
