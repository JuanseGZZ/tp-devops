import { EventBus } from '../events/eventBus.js';
import { EVENTS } from '../events/chat.events.js';
import * as chatApi from '../api/chat.api.js';

const messagesContainer = document.getElementById('messages-container');
const messageForm       = document.getElementById('message-form');
const messageInput      = document.getElementById('message-input');
const sendBtn           = document.getElementById('send-btn');
const chatTitle         = document.getElementById('chat-title');

let activeChatId      = null;
let lastCreatedAt     = null;
let pollInterval      = null;
const renderedIds     = new Set();

export function initChat() {
  EventBus.on(EVENTS.CHAT_SELECTED, ({ chat }) => openChat(chat));

  EventBus.on(EVENTS.LOGGED_OUT, () => {
    stopPolling();
    activeChatId  = null;
    lastCreatedAt = null;
    messagesContainer.innerHTML = '';
    chatTitle.textContent = 'Seleccioná un chat';
    setInputEnabled(false);
  });

  messageForm.addEventListener('submit', handleSend);
}

async function openChat(chat) {
  stopPolling();
  activeChatId  = chat.id;
  lastCreatedAt = null;
  renderedIds.clear();
  messagesContainer.innerHTML = '';
  chatTitle.textContent = chat.name || 'Chat';
  setInputEnabled(true);
  messageInput.focus();

  try {
    const messages = await chatApi.getMessages(chat.id);
    messages.forEach(appendMessage);
    if (messages.length > 0) {
      lastCreatedAt = messages[messages.length - 1].created_at;
      scrollToBottom();
    }
  } catch (err) {
    console.error('Error cargando mensajes', err);
  }

  startPolling();
}

function startPolling() {
  pollInterval = setInterval(async () => {
    if (!activeChatId) return;
    try {
      const newMsgs = await chatApi.getMessages(activeChatId, lastCreatedAt);
      if (newMsgs.length > 0) {
        newMsgs.forEach(appendMessage);
        lastCreatedAt = newMsgs[newMsgs.length - 1].created_at;
        scrollToBottom();
      }
    } catch (err) {
      console.error('Error en poll', err);
    }
  }, 3000);
}

function stopPolling() {
  clearInterval(pollInterval);
  pollInterval = null;
}

async function handleSend(e) {
  e.preventDefault();
  const content = messageInput.value.trim();
  if (!content || !activeChatId) return;

  messageInput.value = '';
  messageInput.focus();

  try {
    const msg = await chatApi.sendMessage(activeChatId, content);
    // Actualizar lastCreatedAt para que el poll no repita este mensaje
    lastCreatedAt = msg.created_at;
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    appendMessage({ ...msg, username: me.username });
    scrollToBottom();
  } catch (err) {
    console.error('Error enviando mensaje', err);
    messageInput.value = content; // restaurar si falló
  }
}

function appendMessage(msg) {
  if (renderedIds.has(msg.id)) return;
  renderedIds.add(msg.id);

  const me    = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwn = msg.user_id === me.id;

  const wrapper = document.createElement('div');
  wrapper.className = `d-flex ${isOwn ? 'justify-content-end' : 'justify-content-start'}`;

  const bubble = document.createElement('div');
  bubble.className = `msg-bubble rounded p-2 ${isOwn ? 'own' : 'other'}`;

  const nameEl = document.createElement('div');
  nameEl.className = `fw-bold small mb-1 ${isOwn ? 'text-end text-primary-emphasis' : 'text-success-emphasis'}`;
  nameEl.textContent = msg.username || '[usuario eliminado]';
  bubble.appendChild(nameEl);

  // Contenido — textContent previene XSS
  const contentEl = document.createElement('div');
  contentEl.textContent = msg.content;
  bubble.appendChild(contentEl);

  // Hora
  const timeEl = document.createElement('div');
  timeEl.className = 'text-muted mt-1 text-end';
  timeEl.style.fontSize = '0.68rem';
  timeEl.textContent = new Date(msg.created_at).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  bubble.appendChild(timeEl);

  wrapper.appendChild(bubble);
  messagesContainer.appendChild(wrapper);
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function setInputEnabled(enabled) {
  messageInput.disabled = !enabled;
  sendBtn.disabled = !enabled;
}
