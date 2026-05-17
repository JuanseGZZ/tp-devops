const pool = require('../config/db');
const Chat = require('../models/chat.model');

function toChat(row) {
  return new Chat({
    id: row.id,
    name: row.name,
    isGroup: row.is_group,
    createdAt: row.created_at,
  });
}

class ChatRepository {
  async findById(chatId) {
    const { rows } = await pool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
    return rows[0] ? toChat(rows[0]) : null;
  }

  // Chats del usuario con el último mensaje de cada uno
  async findByUser(userId) {
    const { rows } = await pool.query(
      `SELECT c.*,
              last_msg.content   AS last_content,
              last_msg.created_at AS last_created_at,
              last_msg.username  AS last_username,
              ARRAY_AGG(json_build_object('id', u.id, 'username', u.username)) AS members
       FROM chats c
       JOIN chat_members cm ON cm.chat_id = c.id
       JOIN chat_members cm2 ON cm2.chat_id = c.id
       JOIN users u ON u.id = cm2.user_id
       LEFT JOIN LATERAL (
         SELECT m.content, m.created_at, us.username
         FROM messages m
         LEFT JOIN users us ON us.id = m.user_id
         WHERE m.chat_id = c.id
         ORDER BY m.created_at DESC
         LIMIT 1
       ) last_msg ON true
       WHERE cm.user_id = $1
       GROUP BY c.id, last_msg.content, last_msg.created_at, last_msg.username
       ORDER BY COALESCE(last_msg.created_at, c.created_at) DESC`,
      [userId]
    );
    return rows.map((row) => ({
      ...toChat(row),
      members: row.members,
      lastMessage: row.last_content
        ? { content: row.last_content, createdAt: row.last_created_at, username: row.last_username }
        : null,
    }));
  }

  async findDirectBetween(userIdA, userIdB) {
    const { rows } = await pool.query(
      `SELECT c.*
       FROM chats c
       JOIN chat_members a ON a.chat_id = c.id AND a.user_id = $1
       JOIN chat_members b ON b.chat_id = c.id AND b.user_id = $2
       WHERE c.is_group = false`,
      [userIdA, userIdB]
    );
    return rows[0] ? toChat(rows[0]) : null;
  }

  async createDirect(userIdA, userIdB) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'INSERT INTO chats (is_group) VALUES (false) RETURNING *'
      );
      const chat = toChat(rows[0]);
      await client.query(
        'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
        [chat.id, userIdA, userIdB]
      );
      await client.query('COMMIT');
      return chat;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async isMember(chatId, userId) {
    const { rows } = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    return rows.length > 0;
  }

  async addMember(chatId, userId) {
    await pool.query(
      `INSERT INTO chat_members (chat_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [chatId, userId]
    );
  }
}

module.exports = new ChatRepository();
