/**
 * User
 *
 * id                          UUID        PK
 * username                    VARCHAR(50) UNIQUE NOT NULL
 * email                       VARCHAR(255) UNIQUE NOT NULL
 * password_hash               TEXT        NOT NULL
 * email_verified              BOOLEAN     DEFAULT false
 * email_verification_code     CHAR(6)     NULL
 * email_verification_expires  TIMESTAMPTZ NULL
 * created_at                  TIMESTAMPTZ DEFAULT now()
 * updated_at                  TIMESTAMPTZ DEFAULT now()
 */
class User {
  constructor({ id, username, email, passwordHash, emailVerified, createdAt, updatedAt }) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.passwordHash = passwordHash;
    this.emailVerified = emailVerified;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = User;
