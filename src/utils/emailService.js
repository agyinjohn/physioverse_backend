const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendWelcomeEmail = async (email, name, password) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Welcome to PhysioVerse - Your Account Details",
    html: `
      <h1>Welcome to PhysioVerse</h1>
      <p>Hello ${name},</p>
      <p>Your account has been created successfully. Here are your login details:</p>
      <p>Email: ${email}</p>
      <p>Password: ${password}</p>
      <p>Please change your password after your first login.</p>
      <p>Best regards,<br>PhysioVerse Team</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendResetPasswordEmail = async (email, name, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reset Your Password - PhysioVerse",
    html: `
      <h1>Password Reset Request</h1>
      <p>Hello ${name},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <p>Verification code: ${resetToken} </p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>PhysioVerse Team</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
};
