import dotenv from "dotenv";
dotenv.config();
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
    from: `"ForTheLoveOfTattoos" <ftlotofficial@gmail.com>`,
    to,
    subject,
    text,
    html,
  });
};