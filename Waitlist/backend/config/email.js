import nodemailer from "nodemailer";

const { POSTMARK_SERVER_TOKEN, MAIL_FROM } = process.env;

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.postmarkapp.com",
      port: 587,
      secure: false,
      auth: {
        user: POSTMARK_SERVER_TOKEN,
        pass: POSTMARK_SERVER_TOKEN,
      },
    });
  }
  return transporter;
}

export async function sendWelcomeEmail({ to, subject, text, html, name }) {
  if (!POSTMARK_SERVER_TOKEN) {
    console.error("sendWelcomeEmail: missing POSTMARK_SERVER_TOKEN");
    return { ok: false, error: "Missing Postmark configuration" };
  }

  try {
    const tx = getTransporter();
    const from = MAIL_FROM || "Inkmity <no-reply@inkmity.com>";
    const headers = { "X-PM-Tag": "waitlist-welcome" };
    if (name) headers["X-PM-Metadata-Name"] = name;

    const info = await tx.sendMail({
      from,
      to,
      subject,
      text,
      html,
      headers,
    });

    console.log("sendWelcomeEmail success:", {
      to,
      messageId: info?.messageId,
      response: info?.response,
    });

    return { ok: true };
  } catch (err) {
    console.error("sendWelcomeEmail error:", {
      message: err?.message,
      code: err?.code,
      response: err?.response,
      stack: err?.stack,
    });
    return { ok: false, error: err?.message || "Email send failed" };
  }
}