const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('../repositories/user.repository');
const chatRepository = require('../repositories/chat.repository');
const emailService = require('./email.service');

const GLOBAL_CHAT_ID = '00000000-0000-0000-0000-000000000001';

const SALT_ROUNDS = 12;
const CODE_TTL_MINUTES = 15;

class AuthService {
  async register({ username, email, password }) {
    const [existingEmail, existingUsername] = await Promise.all([
      userRepository.findByEmail(email),
      userRepository.findByUsername(username),
    ]);
    if (existingEmail) throw { status: 409, message: 'El email ya está registrado.' };
    if (existingUsername) throw { status: 409, message: 'El username ya está en uso.' };

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepository.create({ username, email, passwordHash });

    const code = this._generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    await userRepository.setVerificationCode(user.id, code, expiresAt);
    await emailService.sendVerificationCode(email, code);
  }

  async verifyEmail({ email, code }) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw { status: 400, message: 'Email no encontrado.' };
    if (user.emailVerified) throw { status: 400, message: 'El email ya fue verificado.' };

    // Necesitamos el code y expires — hacemos query directo porque el model no los expone
    const { rows } = await require('../config/db').query(
      'SELECT email_verification_code, email_verification_expires FROM users WHERE id = $1',
      [user.id]
    );
    const { email_verification_code: storedCode, email_verification_expires: expires } = rows[0];

    if (!storedCode || storedCode !== code) throw { status: 400, message: 'Código incorrecto.' };
    if (new Date() > new Date(expires)) throw { status: 400, message: 'El código expiró.' };

    await userRepository.setEmailVerified(user.id);
    await chatRepository.addMember(GLOBAL_CHAT_ID, user.id);
  }

  async resendVerification({ email }) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw { status: 404, message: 'Email no encontrado.' };
    if (user.emailVerified) throw { status: 400, message: 'El email ya fue verificado.' };

    const code = this._generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    await userRepository.setVerificationCode(user.id, code, expiresAt);
    await emailService.sendVerificationCode(email, code);
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw { status: 401, message: 'Credenciales inválidas.' };
    if (!user.emailVerified) throw { status: 403, message: 'Verificá tu email antes de iniciar sesión.' };

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw { status: 401, message: 'Credenciales inválidas.' };

    const token = this._signToken({ sub: user.id, username: user.username });
    return {
      token,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  _generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  _signToken(payload) {
    return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
  }
}

module.exports = new AuthService();
