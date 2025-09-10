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
  try {
    await transporter.sendMail({
      from: `"Inkmity" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
  }
};
