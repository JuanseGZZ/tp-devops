const { MailtrapClient } = require('mailtrap');
const env = require('../config/env');

const client = new MailtrapClient({ token: env.smtp.pass });

class EmailService {
  async sendVerificationCode(to, code) {
    await client.send({
      from: { email: 'hello@demomailtrap.co', name: 'TP Chat' },
      to: [{ email: to }],
      subject: 'Tu código de verificación',
      text: `Tu código es: ${code}`,
      html: `<p>Tu código es: <strong>${code}</strong></p>`,
    });
  }
}

module.exports = new EmailService();
