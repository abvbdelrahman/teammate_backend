const nodemailer = require('nodemailer');
const { htmlToText } = require('html-to-text');

class emailService {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name?.split(' ')[0] || user.name;
    this.url = url;
    this.from = process.env.EMAIL_FROM || 'TeamPlayMate <no-reply@teamplaymate.com>';
  }
console.log('🔧 Gmail Config:', {
  host: process.env.GMAIL_HOST,
  port: process.env.GMAIL_PORT,
  user: process.env.GMAIL_USERNAME ? '✅ Exists' : '❌ Missing',
  pass: process.env.GMAIL_PASSWORD ? '✅ Exists' : '❌ Missing',
});
  // ✉️ إعداد وسيلة الإرسال
  newTransport() {
    return nodemailer.createTransport({
      host: process.env.GMAIL_HOST,
      port: process.env.GMAIL_PORT,
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
    });
  }

  // 📤 إرسال الإيميل
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

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    await this.newTransport().sendMail(mailOptions);
  }

  // 🎉 رسالة ترحيب
  async sendWelcomeEmail(message = 'We are excited to have you join our platform. Start exploring your dashboard now!') {
    const subject = 'Welcome to TeamPlayMate!';
    await this.send(subject, message);
  }

  // 🔐 إعادة تعيين كلمة المرور
  async sendPasswordReset() {
    const subject = 'Your password reset token (valid for 10 minutes)';
    const message = `You requested a password reset. Click the link below to reset your password:
    ${this.url}`;
    await this.send(subject, message);
  }
}

module.exports =  emailService;
