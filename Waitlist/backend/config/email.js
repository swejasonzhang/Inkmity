import nodemailer from "nodemailer";

export async function sendWelcomeEmail({ to, subject, text, html }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: user,
    to,
    subject,
    text,
    html,
  });
}