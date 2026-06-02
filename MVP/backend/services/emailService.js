import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let nodemailer, transporter;

try {
  nodemailer = (await import('nodemailer')).default;
} catch (e) {
  logger.info('📧 Nodemailer not available, using mock email service');
}

const BRAND = {
  name: 'Inkmity',
  mark: '✦',
  bg: '#0b0b0b',
  card: '#111111',
  fg: '#f4f4f4',
  muted: '#9a9a9a',
  border: '#262626',
  accent: '#ffffff',
};

function createTransporter() {
  if (transporter || !nodemailer) return transporter;

  if (config.email.resendApiKey) {
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: config.email.resendApiKey },
    });
  } else if (config.email.smtp.host) {
    const smtpConfig = config.email.smtp;
    transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: smtpConfig.user && smtpConfig.pass ? {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      } : undefined,
    });
  }
  return transporter;
}

function isEmailConfigured() {
  if (!nodemailer) return false;
  return !!config.email.resendApiKey || (!!config.email.smtp.host && !!config.email.smtp.user);
}

/** Wrap body content in the branded, mobile-friendly Inkmity email shell. */
function renderShell({ preheader = '', heading, body }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
          <tr>
            <td style="padding:0 4px 20px;text-align:center;">
              <span style="font-size:22px;font-weight:800;letter-spacing:0.04em;color:${BRAND.fg};">
                ${BRAND.mark}&nbsp;INKMITY
              </span>
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:20px;padding:32px 28px;">
              <h1 style="margin:0 0 8px;font-size:22px;line-height:1.25;font-weight:800;color:${BRAND.fg};text-align:center;">${heading}</h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 8px 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:${BRAND.muted};">
                Inkmity&trade; — discover artists, book with confidence.
              </p>
              <p style="margin:0;font-size:11px;color:#5a5a5a;">
                © ${year} Inkmity. This is an automated message — please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRows(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-top:1px solid ${BRAND.border};">
    ${rows
      .filter((r) => r && r[1] != null && r[1] !== '')
      .map(
        ([label, value]) => `<tr>
          <td style="padding:11px 0;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.muted};">${label}</td>
          <td style="padding:11px 0;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.fg};font-weight:600;text-align:right;">${value}</td>
        </tr>`
      )
      .join('')}
  </table>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 0;">
    <tr><td style="border-radius:12px;background:${BRAND.accent};">
      <a href="${href}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#0a0a0a;text-decoration:none;border-radius:12px;">${label}</a>
    </td></tr>
  </table>`;
}

function fmtDate(d) {
  try { return new Date(d).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }); }
  catch { return String(d); }
}

function createEmailContent(booking, clientName, type = 'confirmation') {
  const cancelUrl = booking.cancelToken
    ? `${config.server.backendUrl}/bookings/${booking._id}/cancel-link?token=${booking.cancelToken}`
    : `${config.server.backendUrl}/bookings/${booking._id}/cancel-link`;
  const apptType = booking.appointmentType === 'consultation' ? 'Consultation' : 'Tattoo Session';
  const when = fmtDate(booking.startTime);

  if (type === 'confirmation') {
    const body = `
      <p style="margin:0 0 4px;font-size:14px;color:${BRAND.muted};text-align:center;">Hi ${clientName}, you're all set.</p>
      ${detailRows([
        ['Appointment', apptType],
        ['Date & time', when],
        ['Duration', booking.durationMinutes ? `${booking.durationMinutes} minutes` : null],
        ['Deposit paid', booking.depositPaidCents != null ? `$${(booking.depositPaidCents / 100).toFixed(2)}` : null],
        ['Final price', booking.finalPriceCents ? `$${(booking.finalPriceCents / 100).toFixed(2)}` : null],
      ])}
      <div style="background:#0d0d0d;border:1px solid ${BRAND.border};border-radius:14px;padding:16px 18px;margin:4px 0 22px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${BRAND.fg};">Before you arrive</p>
        <ul style="margin:0;padding-left:18px;color:${BRAND.muted};font-size:13px;line-height:1.7;">
          <li>Arrive 15 minutes early.</li>
          <li>Bring a valid photo ID.</li>
          <li>Review any aftercare notes from your artist.</li>
        </ul>
      </div>
      ${button(cancelUrl, 'Manage appointment')}
      <p style="margin:18px 0 0;font-size:12px;color:${BRAND.muted};text-align:center;">Need a change? Message your artist anytime in the Inkmity app.</p>
    `;
    return {
      subject: `You're booked ${BRAND.mark} ${apptType} confirmed`,
      html: renderShell({ preheader: `Your ${apptType.toLowerCase()} is confirmed for ${when}.`, heading: 'Appointment confirmed', body }),
      text: `Appointment confirmed

Hi ${clientName}, you're all set.

Appointment: ${apptType}
Date & time: ${when}${booking.durationMinutes ? `\nDuration: ${booking.durationMinutes} minutes` : ''}${booking.depositPaidCents != null ? `\nDeposit paid: $${(booking.depositPaidCents / 100).toFixed(2)}` : ''}${booking.finalPriceCents ? `\nFinal price: $${(booking.finalPriceCents / 100).toFixed(2)}` : ''}

Before you arrive:
- Arrive 15 minutes early
- Bring a valid photo ID
- Review any aftercare notes from your artist

Manage your appointment: ${cancelUrl}

Inkmity(TM) — automated message, please do not reply.`,
    };
  }

  const body = `
    <p style="margin:0 0 4px;font-size:14px;color:${BRAND.muted};text-align:center;">Hi ${clientName}, your appointment has been cancelled.</p>
    ${detailRows([
      ['Appointment', apptType],
      ['Was scheduled for', when],
    ])}
    <p style="margin:0 0 22px;font-size:13px;color:${BRAND.muted};text-align:center;line-height:1.7;">
      Any eligible deposit will be refunded per the refund policy. Ready to rebook? Find your next artist on Inkmity.
    </p>
    ${button(config.server.frontendUrl || 'https://inkmity.com', 'Find an artist')}
  `;
  return {
    subject: `Appointment cancelled ${BRAND.mark} Inkmity`,
    html: renderShell({ preheader: `Your ${apptType.toLowerCase()} on ${when} was cancelled.`, heading: 'Appointment cancelled', body }),
    text: `Appointment cancelled

Hi ${clientName}, your appointment has been cancelled.

Appointment: ${apptType}
Was scheduled for: ${when}

Any eligible deposit will be refunded per the refund policy.

Find your next artist: ${config.server.frontendUrl || 'https://inkmity.com'}

Inkmity(TM) — automated message, please do not reply.`,
  };
}

async function deliver(kind, clientEmail, content) {
  const { subject, html, text } = content;
  try {
    if (isEmailConfigured()) {
      const tx = createTransporter();
      await tx.sendMail({ from: config.email.from, to: clientEmail, subject, html, text });
      logger.logEmail(kind, clientEmail, true);
      return true;
    }
    logger.info(`Mock email - ${kind} would be sent`, { to: clientEmail, subject, preview: text.substring(0, 160) + '…' });
    return true;
  } catch (error) {
    logger.logEmail(kind, clientEmail, false);
    logger.error(`Failed to send ${kind} email`, { error: error.message });
    return false;
  }
}

export async function sendAppointmentConfirmationEmail(booking, clientEmail, clientName) {
  return deliver('confirmation', clientEmail, createEmailContent(booking, clientName, 'confirmation'));
}

export async function sendAppointmentCancellationEmail(booking, clientEmail, clientName) {
  return deliver('cancellation', clientEmail, createEmailContent(booking, clientName, 'cancellation'));
}
