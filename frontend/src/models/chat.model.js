export class Chat {
  constructor({ id, name, isGroup, createdAt, members = [] }) {
    this.id = id;
    this.name = name;
    this.isGroup = isGroup;
    this.createdAt = createdAt;
    this.members = members;
  }
}
