import { ServerClient } from "postmark";

const { POSTMARK_SERVER_TOKEN, MAIL_FROM } = process.env;

let client;

function getClient() {
  if (!client && POSTMARK_SERVER_TOKEN) {
    client = new ServerClient(POSTMARK_SERVER_TOKEN);
  }
  return client;
}

export async function sendWelcomeEmail({ to, subject, text, html, name }) {
  if (!POSTMARK_SERVER_TOKEN) {
    console.error("sendWelcomeEmail: missing POSTMARK_SERVER_TOKEN");
    return { ok: false, error: "Missing Postmark configuration" };
  }

  try {
    const pmClient = getClient();
    if (!pmClient) {
      throw new Error("Postmark client not initialized");
    }

    const from = MAIL_FROM || "jason@inkmity.com";
    
    const message = {
      From: from,
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      MessageStream: "outbound",
      Tag: "waitlist-welcome",
      ReplyTo: "jason@inkmity.com",
      TrackOpens: false,
      TrackLinks: "None",
    };

    if (name) {
      message.Metadata = { name };
    }

    const result = await pmClient.sendEmail(message);

    console.log("sendWelcomeEmail success:", {
      to,
      messageId: result.MessageID,
      submittedAt: result.SubmittedAt,
      toEmail: result.To,
    });

    return { ok: true };
  } catch (err) {
    console.error("sendWelcomeEmail error:", {
      message: err?.message,
      code: err?.ErrorCode,
      statusCode: err?.statusCode,
      response: err?.response,
      stack: err?.stack,
    });
    return { ok: false, error: err?.message || "Email send failed" };
  }
}