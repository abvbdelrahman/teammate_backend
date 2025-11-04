const { Resend } = require('resend');
const { htmlToText } = require('html-to-text');

class emailService {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name?.split(' ')[0] || user.name;
    this.url = url;
    this.from = process.env.EMAIL_FROM || 'TeamPlayMate <onboarding@resend.dev>';
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async send(subject, message) {
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>${subject}</h2>
        <p>Hi ${this.firstName},</p>
        <p>${message}</p>
        ${this.url ? `<p><a href="${this.url}" style="color: #007bff;">Click here</a></p>` : ''}
        <br/>
        <p>Best regards,<br/>TeamPlayMate</p>
      </div>
    `;

    await this.resend.emails.send({
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    });
  }

  async sendWelcomeEmail(message = 'We are excited to have you join our platform. Start exploring your dashboard now!') {
    await this.send('Welcome to TeamPlayMate!', message);
  }

  async sendPasswordReset() {
    const message = `You requested a password reset. Click the link below to reset your password:
    ${this.url}`;
    await this.send('Your password reset token (valid for 10 minutes)', message);
  }
}

module.exports = emailService;
