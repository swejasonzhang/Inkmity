import { ServerClient } from "postmark";

const { POSTMARK_SERVER_TOKEN, MAIL_FROM } = process.env;

if (!POSTMARK_SERVER_TOKEN) {
  console.error("⚠️  EMAIL CONFIGURATION ERROR: POSTMARK_SERVER_TOKEN is not set!");
  console.error("   Emails will not be sent. Please set POSTMARK_SERVER_TOKEN in your environment variables.");
} else {
  console.log("✓ Postmark email service configured");
}

let client;

function getClient() {
  if (!client && POSTMARK_SERVER_TOKEN) {
    client = new ServerClient(POSTMARK_SERVER_TOKEN);
  }
  return client;
}

export async function sendWelcomeEmail({ to, subject, text, html, name }) {
  if (!POSTMARK_SERVER_TOKEN) {
    const errorMsg = "Missing Postmark configuration: POSTMARK_SERVER_TOKEN not set";
    console.error("❌ sendWelcomeEmail FAILED:", errorMsg);
    console.error("   Email recipient:", to);
    return { ok: false, error: errorMsg };
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
    console.log("✓ Welcome email sent successfully:", {
      to,
      messageId: result?.MessageID,
      submittedAt: result?.SubmittedAt,
    });
    return { ok: true, messageId: result?.MessageID };
  } catch (err) {
    const errorDetails = {
      message: err?.message,
      code: err?.ErrorCode,
      statusCode: err?.statusCode,
      response: err?.response,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    };
    console.error("❌ sendWelcomeEmail FAILED:", {
      recipient: to,
      ...errorDetails,
    });
    
    let errorMessage = "Email send failed";
    if (err?.ErrorCode === 401 || err?.statusCode === 401) {
      errorMessage = "Invalid Postmark API token";
    } else if (err?.ErrorCode === 422) {
      errorMessage = "Invalid email format or Postmark configuration";
    } else if (err?.message) {
      errorMessage = err.message;
    }
    
    return { ok: false, error: errorMessage, details: errorDetails };
  }
}