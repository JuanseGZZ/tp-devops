export class Message {
  constructor({ id, chatId, userId, username, content, createdAt }) {
    this.id = id;
    this.chatId = chatId;
    this.userId = userId;
    this.username = username;
    this.content = content;
    this.createdAt = createdAt;
  }
}
