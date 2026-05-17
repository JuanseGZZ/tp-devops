import { EventBus } from '../events/eventBus.js';
import { EVENTS } from '../events/chat.events.js';
import * as userApi from '../api/user.api.js';
import * as chatApi from '../api/chat.api.js';

const sidebarUsername = document.getElementById('sidebar-username');
const friendsList     = document.getElementById('friends-list');
const chatsList       = document.getElementById('chats-list');

export function initSidebar() {
  EventBus.on(EVENTS.LOGGED_IN, ({ user }) => {
    sidebarUsername.textContent = '@' + user.username;
    loadFriends();
    loadChats();
  });

  EventBus.on(EVENTS.LOGGED_OUT, () => {
    sidebarUsername.textContent = '@usuario';
    friendsList.innerHTML = '';
    chatsList.innerHTML = '';
  });
}

async function loadFriends() {
  try {
    const { friends } = await userApi.getFriends();
    friendsList.innerHTML = '';

    if (friends.length === 0) {
      friendsList.appendChild(emptyItem('Sin amigos aún.'));
      return;
    }

    friends.forEach(friend => {
      const li = document.createElement('li');
      li.className = 'list-group-item bg-secondary text-light px-3 py-2';
      li.textContent = friend.username;
      li.addEventListener('click', () => openDMWithFriend(friend));
      friendsList.appendChild(li);
    });
  } catch (err) {
    console.error('Error cargando amigos', err);
  }
}

export async function loadChats() {
  try {
    const chats = await chatApi.getChats();
    chatsList.innerHTML = '';

    if (chats.length === 0) {
      chatsList.appendChild(emptyItem('Sin chats aún.'));
      return;
    }

    const me = JSON.parse(localStorage.getItem('user') || '{}');

    chats.forEach(chat => {
      const li = document.createElement('li');
      li.className = 'list-group-item bg-secondary text-light px-3 py-2';
      li.dataset.chatId = chat.id;

      // Nombre: para DM usamos el username del otro miembro
      const other = chat.members?.find(m => m.id !== me.id);
      const displayName = chat.isGroup ? (chat.name || 'Grupo') : (other?.username || 'Chat');

      const nameEl = document.createElement('div');
      nameEl.className = 'fw-semibold small';
      nameEl.textContent = displayName;
      li.appendChild(nameEl);

      if (chat.lastMessage) {
        const preview = document.createElement('div');
        preview.className = 'text-muted';
        preview.style.fontSize = '0.72rem';
        const txt = chat.lastMessage.content;
        preview.textContent = txt.length > 32 ? txt.slice(0, 32) + '…' : txt;
        li.appendChild(preview);
      }

      li.addEventListener('click', () => {
        setActiveChat(li);
        EventBus.emit(EVENTS.CHAT_SELECTED, { chat: { ...chat, name: displayName } });
      });

      chatsList.appendChild(li);
    });
  } catch (err) {
    console.error('Error cargando chats', err);
  }
}

async function openDMWithFriend(friend) {
  try {
    const { id: chatId } = await chatApi.createChat({ targetUserId: friend.id });
    await loadChats(); // refresca la lista
    // Busca el li recién creado y simula click para abrirlo
    const li = chatsList.querySelector(`[data-chat-id="${chatId}"]`);
    if (li) li.click();
  } catch (err) {
    console.error('Error abriendo DM', err);
  }
}

function setActiveChat(activeLi) {
  chatsList.querySelectorAll('.list-group-item').forEach(el => {
    el.classList.remove('bg-dark');
    el.classList.add('bg-secondary');
  });
  activeLi.classList.remove('bg-secondary');
  activeLi.classList.add('bg-dark');
}

function emptyItem(text) {
  const li = document.createElement('li');
  li.className = 'list-group-item bg-secondary text-muted small px-3 py-2';
  li.textContent = text;
  return li;
}
