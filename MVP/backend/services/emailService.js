// Email service - logs emails in development, sends in production
// In production, install nodemailer and uncomment the nodemailer code below

let nodemailer, transporter;

try {
  // Try to load nodemailer if available
  nodemailer = (await import('nodemailer')).default;
} catch (e) {
  console.log('📧 Nodemailer not available, using mock email service');
}

function createTransporter() {
  if (!transporter && nodemailer) {
    // For development, we'll use a simple SMTP setup
    // In production, you'd want to use a service like SendGrid, Mailgun, etc.
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendAppointmentConfirmationEmail(booking, clientEmail, clientName) {
  try {
    // Create cancellation link - uses the backend route for security
    const cancelUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/bookings/${booking._id}/cancel-link`;

    const htmlContent = `
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
    `;

    const textContent = `
Appointment Confirmed!

Hello ${clientName},

Your appointment has been confirmed with the following details:

Date & Time: ${new Date(booking.startTime).toLocaleString()}
Duration: ${booking.durationMinutes} minutes
Type: ${booking.appointmentType === 'consultation' ? 'Consultation' : 'Tattoo Session'}
Deposit Paid: $${(booking.depositPaidCents / 100).toFixed(2)}
${booking.finalPriceCents ? `Final Price: $${(booking.finalPriceCents / 100).toFixed(2)}` : ''}

Important Reminders:
- Arrive 15 minutes early for your appointment
- Bring valid ID
- If this is a tattoo session, follow all aftercare instructions

To cancel your appointment, visit: ${cancelUrl}

If you need to reschedule or have questions, please contact your artist directly through the Inkmity platform.

This email was sent by Inkmity.
    `;

    if (nodemailer && transporter) {
      // Send actual email if nodemailer is available
      const transporter = createTransporter();
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@inkmity.com',
        to: clientEmail,
        subject: 'Appointment Confirmed - Inkmity',
        html: htmlContent,
        text: textContent
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('📧 Appointment confirmation email sent:', info.messageId);
    } else {
      // Log email content in development/testing
      console.log('📧 [MOCK EMAIL] Appointment confirmation email would be sent to:', clientEmail);
      console.log('📧 [MOCK EMAIL] Subject: Appointment Confirmed - Inkmity');
      console.log('📧 [MOCK EMAIL] Content preview:', textContent.substring(0, 200) + '...');
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to send appointment confirmation email:', error);
    return false;
  }
}

export async function sendAppointmentCancellationEmail(booking, clientEmail, clientName) {
  try {
    const htmlContent = `
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
    `;

    const textContent = `
Appointment Cancelled

Hello ${clientName},

Your appointment has been cancelled. Here are the details:

Original Date & Time: ${new Date(booking.startTime).toLocaleString()}
Type: ${booking.appointmentType === 'consultation' ? 'Consultation' : 'Tattoo Session'}

Any deposit payments will be refunded according to our refund policy.

If you would like to book a new appointment, please visit the Inkmity platform.

This email was sent by Inkmity.
    `;

    if (nodemailer && transporter) {
      // Send actual email if nodemailer is available
      const transporter = createTransporter();
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@inkmity.com',
        to: clientEmail,
        subject: 'Appointment Cancelled - Inkmity',
        html: htmlContent,
        text: textContent
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('📧 Appointment cancellation email sent:', info.messageId);
    } else {
      // Log email content in development/testing
      console.log('📧 [MOCK EMAIL] Appointment cancellation email would be sent to:', clientEmail);
      console.log('📧 [MOCK EMAIL] Subject: Appointment Cancelled - Inkmity');
      console.log('📧 [MOCK EMAIL] Content preview:', textContent.substring(0, 200) + '...');
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to send appointment cancellation email:', error);
    return false;
  }
}