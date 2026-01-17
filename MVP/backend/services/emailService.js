import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let nodemailer, transporter;

try {
  nodemailer = (await import('nodemailer')).default;
} catch (e) {
  logger.info('📧 Nodemailer not available, using mock email service');
}

function createTransporter() {
  if (!transporter && nodemailer) {
    const smtpConfig = config.email.smtp;
    transporter = nodemailer.createTransporter({
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
  return nodemailer && config.email.smtp.host && config.email.smtp.user;
}

function createEmailContent(booking, clientName, type = 'confirmation') {
  const cancelUrl = `${config.server.backendUrl}/bookings/${booking._id}/cancel-link`;

  if (type === 'confirmation') {
    return {
      subject: config.email.templates.confirmationSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Appointment Confirmed!</h1>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Appointment Details</h2>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Date & Time:</strong> ${new Date(booking.startTime).toLocaleString()}</p>
            <p><strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
            <p><strong>Type:</strong> ${booking.appointmentType === 'consultation' ? 'Consultation' : 'Tattoo Session'}</p>
            <p><strong>Deposit Paid:</strong> $${(booking.depositPaidCents / 100).toFixed(2)}</p>
            ${booking.finalPriceCents ? `<p><strong>Final Price:</strong> $${(booking.finalPriceCents / 100).toFixed(2)}</p>` : ''}
          </div>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">Important Reminders</h3>
            <ul style="color: #856404;">
              <li>Arrive 15 minutes early for your appointment</li>
              <li>Bring valid ID</li>
              <li>If this is a tattoo session, follow all aftercare instructions</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${cancelUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Cancel Appointment
            </a>
          </div>
          <p style="color: #666; font-size: 14px; text-align: center;">
            If you need to reschedule or have questions, please contact your artist directly through the Inkmity platform.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by Inkmity. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `Appointment Confirmed!

Hello ${clientName},

Your appointment has been confirmed with the following details:

Date & Time: ${new Date(booking.startTime).toLocaleString()}
Duration: ${booking.durationMinutes} minutes
Type: ${booking.appointmentType === 'consultation' ? 'Consultation' : 'Tattoo Session'}
Deposit Paid: $${(booking.depositPaidCents / 100).toFixed(2)}${booking.finalPriceCents ? `
Final Price: $${(booking.finalPriceCents / 100).toFixed(2)}` : ''}

Important Reminders:
- Arrive 15 minutes early for your appointment
- Bring valid ID
- If this is a tattoo session, follow all aftercare instructions

To cancel your appointment, visit: ${cancelUrl}

If you need to reschedule or have questions, please contact your artist directly through the Inkmity platform.

This email was sent by Inkmity.
      `
    };
  } else if (type === 'cancellation') {
    return {
      subject: config.email.templates.cancellationSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Appointment Cancelled</h1>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Cancelled Appointment Details</h2>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Original Date & Time:</strong> ${new Date(booking.startTime).toLocaleString()}</p>
            <p><strong>Type:</strong> ${booking.appointmentType === 'consultation' ? 'Consultation' : 'Tattoo Session'}</p>
          </div>
          <p style="text-align: center; margin: 30px 0;">
            Your appointment has been successfully cancelled. Any deposit payments will be refunded according to our refund policy.
          </p>
          <p style="color: #666; font-size: 14px; text-align: center;">
            If you would like to book a new appointment, please visit the Inkmity platform.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by Inkmity. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `Appointment Cancelled

Hello ${clientName},

Your appointment has been cancelled. Here are the details:

Original Date & Time: ${new Date(booking.startTime).toLocaleString()}
Type: ${booking.appointmentType === 'consultation' ? 'Consultation' : 'Tattoo Session'}

Any deposit payments will be refunded according to our refund policy.

If you would like to book a new appointment, please visit the Inkmity platform.

This email was sent by Inkmity.
      `
    };
  }
}

export async function sendAppointmentConfirmationEmail(booking, clientEmail, clientName) {
  try {
    const { subject, html, text } = createEmailContent(booking, clientName, 'confirmation');

    if (isEmailConfigured()) {
      const transporter = createTransporter();
      const mailOptions = {
        from: config.email.from,
        to: clientEmail,
        subject,
        html,
        text
      };

      const info = await transporter.sendMail(mailOptions);
      logger.logEmail('confirmation', clientEmail, true);
      return true;
    } else {
      logger.info('Mock email - confirmation would be sent', {
        to: clientEmail,
        subject,
        preview: text.substring(0, 200) + '...'
      });
      return true;
    }
  } catch (error) {
    logger.logEmail('confirmation', clientEmail, false);
    logger.error('Failed to send appointment confirmation email', { error: error.message });
    return false;
  }
}

export async function sendAppointmentCancellationEmail(booking, clientEmail, clientName) {
  try {
    const { subject, html, text } = createEmailContent(booking, clientName, 'cancellation');

    if (isEmailConfigured()) {
      const transporter = createTransporter();
      const mailOptions = {
        from: config.email.from,
        to: clientEmail,
        subject,
        html,
        text
      };

      const info = await transporter.sendMail(mailOptions);
      logger.logEmail('cancellation', clientEmail, true);
      return true;
    } else {
      logger.info('Mock email - cancellation would be sent', {
        to: clientEmail,
        subject,
        preview: text.substring(0, 200) + '...'
      });
      return true;
    }
  } catch (error) {
    logger.logEmail('cancellation', clientEmail, false);
    logger.error('Failed to send appointment cancellation email', { error: error.message });
    return false;
  }
}