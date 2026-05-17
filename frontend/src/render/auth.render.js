import { EventBus } from '../events/eventBus.js';
import { EVENTS } from '../events/chat.events.js';
import * as authApi from '../api/auth.api.js';

const authScreen    = document.getElementById('auth-screen');
const chatScreen    = document.getElementById('chat-screen');
const loginForm     = document.getElementById('login-form');
const registerForm  = document.getElementById('register-form');
const verifyForm    = document.getElementById('verify-form');
const registerStep1 = document.getElementById('register-step-1');
const registerStep2 = document.getElementById('register-step-2');
const loginError    = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const verifyError   = document.getElementById('verify-error');
const logoutBtn     = document.getElementById('logout-btn');
const backBtn       = document.getElementById('back-to-register');
const resendBtn     = document.getElementById('resend-code-btn');

let pendingEmail = '';

export function initAuth() {
  // Si ya hay sesión guardada, entrar directo al chat
  const token = localStorage.getItem('token');
  const user   = JSON.parse(localStorage.getItem('user') || 'null');
  if (token && user) {
    showChatScreen();
    EventBus.emit(EVENTS.LOGGED_IN, { user, token });
  }

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  verifyForm.addEventListener('submit', handleVerify);
  logoutBtn.addEventListener('click', handleLogout);
  backBtn.addEventListener('click', () => {
    registerStep2.classList.add('d-none');
    registerStep1.classList.remove('d-none');
  });

  resendBtn.addEventListener('click', async () => {
    clearError(verifyError);
    try {
      await authApi.resendVerification(pendingEmail);
      showError(verifyError, 'Código reenviado. Revisá tu email.');
      verifyError.classList.replace('alert-danger', 'alert-success');
    } catch (err) {
      showError(verifyError, err.message || 'Error al reenviar.');
    }
  });

  EventBus.on(EVENTS.LOGGED_OUT, showAuthScreen);
}

async function handleLogin(e) {
  e.preventDefault();
  clearError(loginError);
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const { token, user } = await authApi.login({ email, password });
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    showChatScreen();
    EventBus.emit(EVENTS.LOGGED_IN, { user, token });
    loginForm.reset();
  } catch (err) {
    showError(loginError, err.message || 'Error al iniciar sesión.');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  clearError(registerError);
  const username  = document.getElementById('reg-username').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const password  = document.getElementById('reg-password').value;
  const cfToken   = registerForm.querySelector('[name="cf-turnstile-response"]')?.value;
  try {
    await authApi.register({ username, email, password, 'cf-turnstile-response': cfToken });
    pendingEmail = email;
    registerStep1.classList.add('d-none');
    registerStep2.classList.remove('d-none');
  } catch (err) {
    showError(registerError, err.message || 'Error al registrarse.');
    if (window.turnstile) window.turnstile.reset();
  }
}

async function handleVerify(e) {
  e.preventDefault();
  clearError(verifyError);
  const code = document.getElementById('verify-code').value.trim();
  try {
    await authApi.verifyEmail({ email: pendingEmail, code });
    // Volver al login
    registerStep2.classList.add('d-none');
    registerStep1.classList.remove('d-none');
    registerForm.reset();
    verifyForm.reset();
    document.getElementById('tab-login-btn').click();
  } catch (err) {
    showError(verifyError, err.message || 'Código incorrecto o expirado.');
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  EventBus.emit(EVENTS.LOGGED_OUT);
}

function showChatScreen() {
  authScreen.classList.add('d-none');
  chatScreen.classList.remove('d-none');
  // d-flex está en el CSS inicial, pero por si acaso
  chatScreen.style.display = 'flex';
}

function showAuthScreen() {
  chatScreen.classList.add('d-none');
  chatScreen.style.display = '';
  authScreen.classList.remove('d-none');
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('d-none');
}

function clearError(el) {
  el.textContent = '';
  el.classList.add('d-none');
}
