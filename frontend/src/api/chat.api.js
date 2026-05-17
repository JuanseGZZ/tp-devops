const BASE = '/api/chats';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getChats() {
  const res = await fetch(BASE, { headers: authHeader() });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function createChat(payload) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function getMessages(chatId, after = null) {
  const url = after
    ? `${BASE}/${chatId}/messages?after=${encodeURIComponent(after)}`
    : `${BASE}/${chatId}/messages`;
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function sendMessage(chatId, content) {
  const res = await fetch(`${BASE}/${chatId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
