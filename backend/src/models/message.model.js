/**
 * Message
 *
 * id         UUID        PK
 * chat_id    UUID        FK -> chats.id
 * user_id    UUID        FK -> users.id
 * content    TEXT        NOT NULL
 * created_at TIMESTAMPTZ DEFAULT now()
 */
class Message {
  constructor({ id, chatId, userId, content, createdAt }) {
    this.id = id;
    this.chatId = chatId;
    this.userId = userId;
    this.content = content;
    this.createdAt = createdAt;
  }
}

module.exports = Message;
