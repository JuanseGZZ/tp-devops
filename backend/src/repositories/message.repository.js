const pool = require('../config/db');
const Message = require('../models/message.model');

function toMessage(row) {
  return new Message({
    id: row.id,
    chatId: row.chat_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
  });
}

class MessageRepository {
  // Sin after: últimos 100 mensajes (carga inicial), ordenados ASC para render cronológico.
  // Con after: solo mensajes con created_at > after (polling incremental).
  async findByChatId(chatId, after = null) {
    if (after) {
      const { rows } = await pool.query(
        `SELECT m.id, m.chat_id, m.user_id, m.content, m.created_at,
                COALESCE(u.username, '[usuario eliminado]') AS username
         FROM messages m
         LEFT JOIN users u ON u.id = m.user_id
         WHERE m.chat_id = $1 AND m.created_at > $2
         ORDER BY m.created_at ASC`,
        [chatId, after]
      );
      return rows;
    }

    const { rows } = await pool.query(
      `SELECT m.id, m.chat_id, m.user_id, m.content, m.created_at,
              COALESCE(u.username, '[usuario eliminado]') AS username
       FROM (
         SELECT * FROM messages
         WHERE chat_id = $1
         ORDER BY created_at DESC
         LIMIT 100
       ) m
       LEFT JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at ASC`,
      [chatId]
    );
    return rows;
  }

  async create({ chatId, userId, content }) {
    const { rows } = await pool.query(
      `INSERT INTO messages (chat_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, chat_id, user_id, content, created_at`,
      [chatId, userId, content]
    );
    return rows[0]; // mismo shape que findByChatId (snake_case)
  }
}

module.exports = new MessageRepository();
