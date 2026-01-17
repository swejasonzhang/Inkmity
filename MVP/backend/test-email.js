import { sendAppointmentConfirmationEmail } from './services/emailService.js';

async function testEmail() {
  console.log('Testing email service...');

  const mockBooking = {
  const mockBooking = {
    _id: '507f1f77bcf86cd799439011',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    durationMinutes: 120,
    appointmentType: 'consultation',
    depositPaidCents: 5000,
    finalPriceCents: 15000,
  };

  try {
    const result = await sendAppointmentConfirmationEmail(
      mockBooking,
      'test@example.com',
      'Test User'
    );

    if (result) {
      console.log('✅ Email sent successfully (check your email service logs)');
    } else {
      console.log('❌ Email failed to send');
    }
  } catch (error) {
    console.error('❌ Email service error:', error.message);
  }
}

testEmail();