import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendWelcomeEmail = async (to) => {
  await transporter.sendMail({
    from: `"Jason Zhang" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Welcome to the waitlist 🎉",
    text: "Thanks for joining the waitlist for For the Love of Tattoos!",
  });
};
