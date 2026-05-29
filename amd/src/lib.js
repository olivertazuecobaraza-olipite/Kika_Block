var questionString = 'Ask a question...';
var errorString = 'An error occurred! Please try again later.';

let state = {
    blockId: null,
    courseId: null,
    userId: null,
    persistConvo: true,
    conversationId: null,
    conversations: []
};

const storageKey = () => `kika_active_conversation_${state.userId}_${state.courseId}_${state.blockId}`;

const apiUrl = (path, params = {}) => {
    const url = new URL(`${M.cfg.wwwroot}/blocks/kika_chat/api/${path}`, window.location.origin);
    Object.keys(params).forEach((key) => url.searchParams.set(key, params[key]));
    return url.toString();
};

const getJson = (response) => response.text().then((text) => {
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch (error) {
        const detail = text ? ` Respuesta: ${text.slice(0, 120)}` : '';
        throw new Error(`La respuesta del servidor no es JSON (HTTP ${response.status}).${detail}`);
    }

    if (!response.ok) {
        throw new Error(data.error || response.statusText);
    }
    return data;
});

const hideWelcome = (immediate = false) => {
    const welcomeMsg = document.getElementById("welcome-message");
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

const showWelcome = () => {
    const welcomeMsg = document.getElementById("welcome-message");
    if (!welcomeMsg) return;
    welcomeMsg.classList.remove("hidden-welcome", "d-none");
    welcomeMsg.style.removeProperty("display");
    welcomeMsg.style.removeProperty("opacity");
    welcomeMsg.style.removeProperty("transform");
    welcomeMsg.style.removeProperty("pointer-events");
    welcomeMsg.style.removeProperty("transition");
};

export const init = (data) => {
    state.blockId = data.blockId;
    state.courseId = data.courseId;
    state.userId = data.userId;
    state.persistConvo = data.persistConvo === "1";

    if (state.persistConvo) {
        state.conversationId = localStorage.getItem(storageKey());
    }

    window.addEventListener('resize', event => {
        event.stopImmediatePropagation();
    }, true);

    bindInputHandlers();
    bindHeaderHandlers();
    initButtonHandlers();
    loadStrings();
    refreshConversationList(true);
};

const bindInputHandlers = () => {
    const inputField = document.querySelector('#openai_input');
    const sendButton = document.querySelector('.block_kika_chat #go');

    if (inputField) {
        inputField.addEventListener('input', () => {
            inputField.style.height = 'auto';
            inputField.style.height = Math.min(inputField.scrollHeight, 120) + 'px';
        });

        inputField.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendCurrentInput();
            }
        });
    }

    if (sendButton) {
        sendButton.addEventListener('click', sendCurrentInput);
    }
};

const bindHeaderHandlers = () => {
    const refreshBtn = document.querySelector('.block_kika_chat #refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', startNewConversation);
    }

    const newConversationBtn = document.querySelector('.block_kika_chat #kika_new_conversation');
    if (newConversationBtn) {
        newConversationBtn.addEventListener('click', startNewConversation);
    }

    const toggleBtn = document.querySelector('.block_kika_chat #conversation-toggle');
    if (toggleBtn) {
        setConversationPanelOpen(toggleBtn.getAttribute('aria-expanded') === 'true');
        toggleBtn.addEventListener('click', () => {
            const wrapper = document.querySelector('.block_kika_chat .openai-chat-wrapper');
            if (wrapper) {
                setConversationPanelOpen(!wrapper.classList.contains('conversation-panel-open'));
            }
        });
    }

    const popoutBtn = document.querySelector('.block_kika_chat #popout');
    if (popoutBtn) {
        popoutBtn.addEventListener('click', () => {
            if (document.querySelector('.drawer.drawer-right')) {
                document.querySelector('.drawer.drawer-right').style.zIndex = '1041';
            }
            const block = document.querySelector('.block_kika_chat');
            if (block) {
                block.classList.toggle('expanded');
            }
        });
    }
};

const setConversationPanelOpen = (open) => {
    const wrapper = document.querySelector('.block_kika_chat .openai-chat-wrapper');
    const panel = document.querySelector('.block_kika_chat #kika_conversation_panel');
    const toggleBtn = document.querySelector('.block_kika_chat #conversation-toggle');

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
            {key: 'erroroccurred', component: 'block_kika_chat'}
        ]).then((results) => {
            questionString = results[0];
            errorString = results[1];
        });
    });
};

const sendCurrentInput = () => {
    const inputField = document.querySelector('#openai_input');
    if (!inputField) return;

    const value = inputField.value.trim();
    if (value === "") return;

    hideWelcome(false);
    addToChatLog('user', escapeHtml(value));
    createCompletion(value);
    inputField.value = '';
    inputField.style.height = 'auto';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleButtonClick = (buttonId, defaultMessage) => {
    const button = document.querySelector(buttonId);
    if (!button) return;

    button.addEventListener('click', () => {
        const inputField = document.querySelector('#openai_input');
        if (!inputField) return;
        inputField.value = defaultMessage;
        sendCurrentInput();
    });
};

const initButtonHandlers = () => {
    handleButtonClick('#crear-examen', 'Dime que informacion necesitas que te proporcione para que me ayudes a disenar un examen');
    handleButtonClick('#crear-resumen', 'Que informacion debo darte para que me hagas un resumen de una parte de este curso?');
    handleButtonClick('#crear-esquema', 'Me gustaria hacer un esquema: que datos necesitas para ayudarme a hacerlo?');
    handleButtonClick('#crear-idea', 'Necesito hacer un ejercicio o practica. Que datos necesitas para ayudarme con esto?');
};

const refreshConversationList = (loadActive = false) => {
    setConversationStatus('Cargando conversaciones...');
    fetch(apiUrl('conversations.php', {blockId: state.blockId}))
        .then(getJson)
        .then((data) => {
            state.conversations = data.conversations || [];
            renderConversationList();
            setConversationStatus(state.conversations.length ? '' : 'No hay conversaciones todavia.');

            if (loadActive && state.persistConvo && state.conversationId) {
                const exists = state.conversations.some((conversation) => conversation.conversation_id === state.conversationId);
                if (exists) {
                    return loadConversation(state.conversationId);
                }
                clearActiveConversation();
            }
        })
        .catch((error) => setConversationStatus(error.message || errorString));
};

const renderConversationList = () => {
    const list = document.querySelector('#kika_conversation_list');
    if (!list) return;
    list.innerHTML = '';

    state.conversations.forEach((conversation) => {
        const item = document.createElement('div');
        item.className = `kika-conversation-item${conversation.conversation_id === state.conversationId ? ' active' : ''}`;
        item.dataset.conversationId = conversation.conversation_id;

        const content = document.createElement('button');
        content.className = 'kika-conversation-content';
        content.type = 'button';
        content.addEventListener('click', () => loadConversation(conversation.conversation_id));

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
        rename.addEventListener('click', () => renameConversation(conversation));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'kika-conversation-icon-btn kika-conversation-icon-btn-danger';
        remove.title = 'Borrar';
        remove.setAttribute('aria-label', 'Borrar conversacion');
        remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
        remove.addEventListener('click', () => deleteConversation(conversation));

        actions.append(rename, remove);
        item.append(content, actions);
        list.appendChild(item);
    });
};

const setConversationStatus = (message) => {
    const status = document.querySelector('#kika_conversation_status');
    if (status) {
        status.textContent = message;
    }
};

const loadConversation = (conversationId) => {
    if (!conversationId) return Promise.resolve();
    setConversationStatus('Cargando mensajes...');
    return fetch(apiUrl('conversation_messages.php', {blockId: state.blockId, conversation_id: conversationId}))
        .then(getJson)
        .then((data) => {
            state.conversationId = data.conversation_id;
            persistActiveConversation();
            document.querySelector('#kika_chat_log').innerHTML = '';
            (data.messages || []).forEach((message) => {
                addToChatLog(message.role === 'user' ? 'user' : 'bot', message.message);
            });
            if ((data.messages || []).length > 0) {
                hideWelcome(true);
            } else {
                showWelcome();
            }
            setConversationStatus('');
            renderConversationList();
        })
        .catch((error) => setConversationStatus(error.message || errorString));
};

const startNewConversation = () => {
    clearActiveConversation();
    document.querySelector('#kika_chat_log').innerHTML = '';
    showWelcome();
    renderConversationList();
    const input = document.querySelector('#openai_input');
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

const renameConversation = (conversation) => {
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
        .then(() => refreshConversationList(false))
        .catch((error) => setConversationStatus(error.message || errorString));
};

const deleteConversation = (conversation) => {
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
                startNewConversation();
            }
            return refreshConversationList(false);
        })
        .catch((error) => setConversationStatus(error.message || errorString));
};

const addToChatLog = (type, message) => {
    hideWelcome(true);
    setTimeout(() => {
        let messageContainer = document.querySelector('#kika_chat_log');
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
        } else {
            appendBubble(messageElem, message);
        }

        messageContainer.appendChild(messageElem);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 100);
};

const appendBubble = (messageElem, message) => {
    const bubble = document.createElement('div');
    bubble.classList.add('openai-message-bubble');
    bubble.innerHTML = message;
    messageElem.appendChild(bubble);
};

const createCompletion = (message) => {
    const controlBar = document.querySelector('.block_kika_chat #control_bar');
    const input = document.querySelector('#openai_input');
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
    addToChatLog('bot loading', '');

    fetch(apiUrl('completion.php'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            message: message,
            blockId: state.blockId,
            conversationId: state.conversationId
        })
    })
        .then((response) => {
            removeLoadingMessage();
            if (controlBar) {
                controlBar.classList.remove('disabled');
            }
            return getJson(response);
        })
        .then((data) => {
            state.conversationId = data.conversation_id;
            persistActiveConversation();
            addToChatLog('bot', data.message);
            refreshConversationList(false);
            if (input) {
                input.focus();
            }
        })
        .catch((error) => {
            removeLoadingMessage();
            if (controlBar) {
                controlBar.classList.remove('disabled');
            }
            if (input) {
                input.classList.add('error');
                input.placeholder = error.message || errorString;
            }
        });
};

const removeLoadingMessage = () => {
    let messageContainer = document.querySelector('#kika_chat_log');
    if (messageContainer && messageContainer.lastElementChild && messageContainer.lastElementChild.classList.contains('loading')) {
        messageContainer.removeChild(messageContainer.lastElementChild);
    }
};

const escapeHtml = (value) => {
    const span = document.createElement('span');
    span.textContent = value;
    return span.innerHTML;
};
