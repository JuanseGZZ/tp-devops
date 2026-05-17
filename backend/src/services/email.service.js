const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  auth: { user: env.smtp.user, pass: env.smtp.pass },
});

class EmailService {
  async sendVerificationCode(to, code) {
    await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject: 'Tu código de verificación',
      text: `Tu código es: ${code}`,
      html: `<p>Tu código es: <strong>${code}</strong></p>`,
    });
  }
}

module.exports = new EmailService();
