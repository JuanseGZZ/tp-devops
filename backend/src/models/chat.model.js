/**
 * Chat
 *
 * id         UUID        PK
 * name       VARCHAR(100) NULL  (null for direct messages)
 * is_group   BOOLEAN     DEFAULT false
 * created_at TIMESTAMPTZ DEFAULT now()
 *
 * ChatMember (join table)
 * chat_id    UUID FK -> chats.id
 * user_id    UUID FK -> users.id
 * joined_at  TIMESTAMPTZ DEFAULT now()
 * PK (chat_id, user_id)
 */
class Chat {
  constructor({ id, name, isGroup, createdAt }) {
    this.id = id;
    this.name = name;
    this.isGroup = isGroup;
    this.createdAt = createdAt;
  }
}

module.exports = Chat;
