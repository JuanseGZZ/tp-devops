const userRepository = require('../repositories/user.repository');
const friendshipRepository = require('../repositories/friendship.repository');
const Friendship = require('../models/friendship.model');

class UserService {
  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw { status: 404, message: 'Usuario no encontrado.' };
    return { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt };
  }

  async search(query, requesterId) {
    if (!query || query.trim().length < 2) {
      throw { status: 400, message: 'La búsqueda debe tener al menos 2 caracteres.' };
    }
    return userRepository.searchByUsername(query.trim(), requesterId);
  }

  async getFriends(userId) {
    const [friends, pendingReceived, pendingSent] = await Promise.all([
      friendshipRepository.findAcceptedByUser(userId),
      friendshipRepository.findPendingReceived(userId),
      friendshipRepository.findPendingSent(userId),
    ]);
    return { friends, pendingReceived, pendingSent };
  }

  async sendFriendRequest(requesterId, addresseeId) {
    if (requesterId === addresseeId) {
      throw { status: 400, message: 'No podés enviarte una solicitud a vos mismo.' };
    }

    const target = await userRepository.findById(addresseeId);
    if (!target) throw { status: 404, message: 'Usuario no encontrado.' };

    const existing = await friendshipRepository.findByUsers(requesterId, addresseeId);
    if (existing) {
      if (existing.status === Friendship.STATUS.ACCEPTED) {
        throw { status: 409, message: 'Ya son amigos.' };
      }
      throw { status: 409, message: 'Ya existe una solicitud entre estos usuarios.' };
    }

    return friendshipRepository.create(requesterId, addresseeId);
  }

  async respondFriendRequest(friendshipId, userId, status) {
    if (!['accepted', 'rejected'].includes(status)) {
      throw { status: 400, message: 'Estado inválido.' };
    }

    const friendship = await friendshipRepository.findById(friendshipId);
    if (!friendship) throw { status: 404, message: 'Solicitud no encontrada.' };

    // Solo el destinatario puede responder
    if (friendship.addresseeId !== userId) {
      throw { status: 403, message: 'No tenés permiso para responder esta solicitud.' };
    }
    if (friendship.status !== Friendship.STATUS.PENDING) {
      throw { status: 400, message: 'La solicitud ya fue respondida.' };
    }

    return friendshipRepository.updateStatus(friendshipId, status);
  }
}

module.exports = new UserService();
