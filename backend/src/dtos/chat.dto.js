class SendMessageDTO {
  constructor({ content }) {
    this.content = content;
  }
}

class CreateChatDTO {
  constructor({ targetUserId, isGroup = false, name = null, memberIds = [] }) {
    this.targetUserId = targetUserId;
    this.isGroup = isGroup;
    this.name = name;
    this.memberIds = memberIds;
  }
}

module.exports = { SendMessageDTO, CreateChatDTO };
