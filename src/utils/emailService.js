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

const sendAppointmentConfirmation = async (
  recipientEmail,
  recipientName,
  appointment
) => {
  const formattedDate = new Date(appointment.dateTime).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: recipientEmail,
    subject: "PhysioVerse - Appointment Confirmation",
    html: `
      <h1>Appointment Confirmation</h1>
      <p>Hello ${recipientName},</p>
      <p>Your appointment has been scheduled successfully:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Date & Time:</strong> ${formattedDate}</p>
        <p><strong>Type:</strong> ${appointment.type}</p>
        <p><strong>Patient:</strong> ${appointment.patient.firstName} ${appointment.patient.lastName}</p>
        <p><strong>Therapist:</strong> ${appointment.therapist.name}</p>
      </div>
      <p>If you need to reschedule or cancel, please contact us.</p>
      <p>Best regards,<br>PhysioVerse Team</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendAppointmentUpdate = async (
  recipientEmail,
  recipientName,
  appointment,
  updateType
) => {
  const formattedDate = new Date(appointment.dateTime).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: recipientEmail,
    subject: `PhysioVerse - Appointment ${updateType}`,
    html: `
      <h1>Appointment ${updateType}</h1>
      <p>Hello ${recipientName},</p>
      <p>Your appointment has been ${updateType.toLowerCase()}:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Date & Time:</strong> ${formattedDate}</p>
        <p><strong>Type:</strong> ${appointment.type}</p>
        <p><strong>Patient:</strong> ${appointment.patient.firstName} ${
      appointment.patient.lastName
    }</p>
        <p><strong>Therapist:</strong> ${appointment.therapist.name}</p>
      </div>
      <p>If you have any questions, please contact us.</p>
      <p>Best regards,<br>PhysioVerse Team</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendAppointmentConfirmation,
  sendAppointmentUpdate,
};
