// One-time launch announcement to everyone on the waitlist.
//
//   node scripts/launchEmail.js            # DRY RUN — counts + preview, sends nothing
//   node scripts/launchEmail.js --send     # actually sends (Postmark broadcast stream)
//
// Sends on Postmark's BROADCAST stream, which appends the required unsubscribe
// link + List-Unsubscribe header and manages suppressions automatically.
// CAN-SPAM also requires a valid physical mailing address — set MAIL_PHYSICAL_ADDRESS.

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { ServerClient } from "postmark";
import Waitlist from "../models/Waitlist.js";

const SEND = process.argv.includes("--send");
const TEST_EMAIL = (process.argv.find((a) => a.startsWith("--test=")) || "").split("=")[1] || null;
const FROM = process.env.MAIL_FROM || "jason@inkmity.com";
const STREAM = process.env.POSTMARK_BROADCAST_STREAM || "broadcast";
const SITE = "https://inkmity.com";
const PHYSICAL_ADDRESS =
  process.env.MAIL_PHYSICAL_ADDRESS || "Inkmity — [ADD YOUR MAILING ADDRESS]";
const SUBJECT = "Inkmity is launching — your spot is ready";
const BATCH = 500;

function firstName(name) {
  const n = String(name || "").trim().split(/\s+/)[0];
  return n || "there";
}

function htmlBody(name) {
  return `<!doctype html><html><body style="margin:0;background:#0b0b0b;color:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <h1 style="font-size:24px;font-weight:800;margin:0 0 8px">Inkmity is launching 🖤</h1>
    <p style="font-size:15px;line-height:1.6;color:#cfcfcf;margin:0 0 16px">Hi ${firstName(name)}, you joined the Inkmity waitlist — and it's go time. You can now discover tattoo artists by style, message with full context, and book end-to-end with secure payments.</p>
    <p style="margin:24px 0">
      <a href="${SITE}" style="display:inline-block;background:#f5f5f5;color:#0b0b0b;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:12px">Explore Inkmity</a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#9a9a9a;margin:24px 0 0">You're receiving this because you signed up at inkmity.com.</p>
    <p style="font-size:12px;line-height:1.6;color:#7a7a7a;margin:8px 0 0">${PHYSICAL_ADDRESS}</p>
  </div></body></html>`;
}

function textBody(name) {
  return [
    `Hi ${firstName(name)},`,
    "",
    "Inkmity is launching. You joined the waitlist — you can now discover tattoo artists by style, message with full context, and book end-to-end with secure payments.",
    "",
    `Explore Inkmity: ${SITE}`,
    "",
    "You're receiving this because you signed up at inkmity.com.",
    PHYSICAL_ADDRESS,
  ].join("\n");
}

async function main() {
  // Test mode: send a single real email to the given address (no DB needed).
  if (TEST_EMAIL) {
    if (!process.env.POSTMARK_SERVER_TOKEN) {
      console.error("POSTMARK_SERVER_TOKEN is required to send a test.");
      process.exit(1);
    }
    const client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN);
    console.log(`Sending ONE test email to ${TEST_EMAIL} (from ${FROM}, stream ${STREAM})…`);
    const res = await client.sendEmail({
      From: FROM,
      To: TEST_EMAIL,
      Subject: `[TEST] ${SUBJECT}`,
      HtmlBody: htmlBody("there"),
      TextBody: textBody("there"),
      MessageStream: STREAM,
    });
    console.log(
      res.ErrorCode === 0
        ? `✓ Test sent (MessageID ${res.MessageID}). Check ${TEST_EMAIL}.`
        : `✗ Failed: ${res.Message}`
    );
    return;
  }

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  const docs = await Waitlist.find({}).select("name email").lean();
  const seen = new Set();
  const recipients = [];
  for (const d of docs) {
    const email = String(d.email || "").trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({ email, name: d.name });
  }

  console.log(`\nLaunch email — ${SEND ? "SEND" : "DRY RUN"}`);
  console.log(`Subscribers: ${docs.length} · unique recipients: ${recipients.length}`);
  console.log(`From: ${FROM} · stream: ${STREAM}`);
  console.log(`Subject: ${SUBJECT}`);
  if (PHYSICAL_ADDRESS.includes("[ADD YOUR MAILING ADDRESS]")) {
    console.warn("⚠️  Set MAIL_PHYSICAL_ADDRESS — a real postal address is legally required.");
  }

  if (!SEND) {
    const sample = recipients[0] || { name: "there", email: "sample@example.com" };
    console.log(`\n--- preview (to ${sample.email}) ---\n`);
    console.log(textBody(sample.name));
    console.log("\n(no emails sent — rerun with --send to deliver)\n");
    await mongoose.disconnect();
    return;
  }

  if (!process.env.POSTMARK_SERVER_TOKEN) {
    console.error("POSTMARK_SERVER_TOKEN is required to send.");
    process.exit(1);
  }
  const client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN);

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH);
    const messages = slice.map((r) => ({
      From: FROM,
      To: r.email,
      Subject: SUBJECT,
      HtmlBody: htmlBody(r.name),
      TextBody: textBody(r.name),
      MessageStream: STREAM,
    }));
    const results = await client.sendEmailBatch(messages);
    for (const res of results) {
      if (res.ErrorCode === 0) sent++;
      else {
        failed++;
        console.error(`  fail ${res.To}: ${res.Message}`);
      }
    }
    console.log(`Batch ${i / BATCH + 1}: ${slice.length} queued (sent ${sent}, failed ${failed})`);
  }

  console.log(`\nDone. Sent ${sent}, failed ${failed}.\n`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("launchEmail error:", e);
  process.exit(1);
});
