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

const sendResetPasswordEmail = async (email, name, otp) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reset Your Password - PhysioVerse",
    html: `
      <h1>Password Reset Request</h1>
      <p>Hello ${name},</p>
      <p>You requested to reset your password. Here is your OTP code:</p>
      <h2 style="font-size: 24px; letter-spacing: 2px; background: #f5f5f5; padding: 10px; text-align: center;">${otp}</h2>
      <p>This code will expire in 15 minutes.</p>
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
