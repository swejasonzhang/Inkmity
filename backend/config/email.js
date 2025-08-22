import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendWelcomeEmail = async ({ to, subject, text, html }) => {
  await transporter.sendMail({
    from: `"Jason Zhang" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};
