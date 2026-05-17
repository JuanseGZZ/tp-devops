const BASE = '/api/users';

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMe() {
  const res = await fetch(`${BASE}/me`, { headers: authHeader() });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function searchUsers(q) {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`, { headers: authHeader() });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function getFriends() {
  const res = await fetch(`${BASE}/friends`, { headers: authHeader() });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function sendFriendRequest(addresseeId) {
  const res = await fetch(`${BASE}/friends/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ addresseeId }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
