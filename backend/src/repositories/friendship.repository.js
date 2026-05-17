const pool = require('../config/db');
const Friendship = require('../models/friendship.model');

function toFriendship(row) {
  return new Friendship({
    id: row.id,
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    status: row.status,
    createdAt: row.created_at,
  });
}

class FriendshipRepository {
  async findByUsers(requesterId, addresseeId) {
    const { rows } = await pool.query(
      `SELECT * FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [requesterId, addresseeId]
    );
    return rows[0] ? toFriendship(rows[0]) : null;
  }

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM friendships WHERE id = $1',
      [id]
    );
    return rows[0] ? toFriendship(rows[0]) : null;
  }

  async create(requesterId, addresseeId) {
    const { rows } = await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id)
       VALUES ($1, $2)
       RETURNING *`,
      [requesterId, addresseeId]
    );
    return toFriendship(rows[0]);
  }

  async updateStatus(friendshipId, status) {
    const { rows } = await pool.query(
      `UPDATE friendships SET status = $1 WHERE id = $2 RETURNING *`,
      [status, friendshipId]
    );
    return rows[0] ? toFriendship(rows[0]) : null;
  }

  // Devuelve los usuarios con quienes tiene amistad aceptada
  async findAcceptedByUser(userId) {
    const { rows } = await pool.query(
      `SELECT u.id, u.username
       FROM friendships f
       JOIN users u ON u.id = CASE
         WHEN f.requester_id = $1 THEN f.addressee_id
         ELSE f.requester_id
       END
       WHERE (f.requester_id = $1 OR f.addressee_id = $1)
         AND f.status = 'accepted'
       ORDER BY u.username`,
      [userId]
    );
    return rows;
  }

  // Solicitudes recibidas pendientes (alguien me pidió amistad)
  async findPendingReceived(userId) {
    const { rows } = await pool.query(
      `SELECT f.id AS friendship_id, u.id, u.username
       FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return rows;
  }

  // Solicitudes enviadas pendientes (yo pedí amistad)
  async findPendingSent(userId) {
    const { rows } = await pool.query(
      `SELECT f.id AS friendship_id, u.id, u.username
       FROM friendships f
       JOIN users u ON u.id = f.addressee_id
       WHERE f.requester_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return rows;
  }
}

module.exports = new FriendshipRepository();
