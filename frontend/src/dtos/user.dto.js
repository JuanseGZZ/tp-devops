import { User } from '../models/user.model.js';

export const fromApiUser = (raw) => new User({
  id: raw.id,
  username: raw.username,
  email: raw.email,
  emailVerified: raw.emailVerified,
  createdAt: raw.createdAt,
});
