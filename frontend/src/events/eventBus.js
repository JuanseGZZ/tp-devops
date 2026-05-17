// Minimal pub/sub so modules can communicate without direct coupling
const listeners = {};

export const EventBus = {
  on(event, cb) {
    (listeners[event] ??= []).push(cb);
  },
  off(event, cb) {
    listeners[event] = (listeners[event] ?? []).filter((fn) => fn !== cb);
  },
  emit(event, data) {
    (listeners[event] ?? []).forEach((cb) => cb(data));
  },
};
