const chatRepository = require('../repositories/chat.repository');
const messageRepository = require('../repositories/message.repository');

// Elimina cualquier tag HTML para prevenir XSS almacenado
function sanitize(str) {
  return str.replace(/[<>]/g, '').trim();
}

class ChatService {
  async getChatsForUser(userId) {
    return chatRepository.findByUser(userId);
  }

  // Idempotente: devuelve el DM existente o crea uno nuevo
  async openDirectChat(requesterId, targetUserId) {
    if (requesterId === targetUserId) {
      throw { status: 400, message: 'No podés abrir un chat con vos mismo.' };
    }
    const existing = await chatRepository.findDirectBetween(requesterId, targetUserId);
    if (existing) return existing;
    return chatRepository.createDirect(requesterId, targetUserId);
  }

  async getMessages(chatId, userId, after = null) {
    const isMember = await chatRepository.isMember(chatId, userId);
    if (!isMember) throw { status: 403, message: 'No sos miembro de este chat.' };
    return messageRepository.findByChatId(chatId, after || null);
  }

  async sendMessage(chatId, userId, content) {
    const isMember = await chatRepository.isMember(chatId, userId);
    if (!isMember) throw { status: 403, message: 'No sos miembro de este chat.' };

    const clean = sanitize(content);
    if (!clean) throw { status: 400, message: 'El mensaje no puede estar vacío.' };
    if (clean.length > 2000) throw { status: 400, message: 'El mensaje es demasiado largo.' };

    return messageRepository.create({ chatId, userId, content: clean });
  }
}

module.exports = new ChatService();
