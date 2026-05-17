const pool = require('../config/db');
const User = require('../models/user.model');

function toUser(row) {
  if (!row) return null;
  return new User({
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

class UserRepository {
  async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return toUser(rows[0]);
  }

  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return toUser(rows[0]);
  }

  async findByUsername(username) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return toUser(rows[0]);
  }

  async create({ username, email, passwordHash }) {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [username, email, passwordHash]
    );
    return toUser(rows[0]);
  }

  async setEmailVerified(userId) {
    await pool.query(
      `UPDATE users
       SET email_verified = true,
           email_verification_code = NULL,
           email_verification_expires = NULL,
           updated_at = now()
       WHERE id = $1`,
      [userId]
    );
  }

  async setVerificationCode(userId, code, expiresAt) {
    await pool.query(
      `UPDATE users
       SET email_verification_code = $1,
           email_verification_expires = $2,
           updated_at = now()
       WHERE id = $3`,
      [code, expiresAt, userId]
    );
  }

  async searchByUsername(query, excludeUserId) {
    const { rows } = await pool.query(
      `SELECT id, username FROM users
       WHERE username ILIKE $1
         AND id != $2
         AND email_verified = true
       ORDER BY username
       LIMIT 10`,
      [`%${query}%`, excludeUserId]
    );
    return rows;
  }
}

module.exports = new UserRepository();
