class UserResponseDTO {
  constructor({ id, username, email, emailVerified, createdAt }) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.emailVerified = emailVerified;
    this.createdAt = createdAt;
  }
}

module.exports = { UserResponseDTO };
