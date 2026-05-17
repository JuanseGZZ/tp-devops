/**
 * Friendship
 *
 * id            UUID        PK
 * requester_id  UUID        FK -> users.id
 * addressee_id  UUID        FK -> users.id
 * status        ENUM        'pending' | 'accepted' | 'rejected'
 * created_at    TIMESTAMPTZ DEFAULT now()
 *
 * UNIQUE (requester_id, addressee_id)
 */
class Friendship {
  static STATUS = Object.freeze({
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
  });

  constructor({ id, requesterId, addresseeId, status, createdAt }) {
    this.id = id;
    this.requesterId = requesterId;
    this.addresseeId = addresseeId;
    this.status = status;
    this.createdAt = createdAt;
  }
}

module.exports = Friendship;
