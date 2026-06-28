import { jest, describe, test, expect, beforeEach } from "@jest/globals";

process.env.RESEND_API_KEY = "re_test_key";
process.env.FROM_EMAIL = "Inkmity <test@inkmity.com>";
process.env.BACKEND_URL = "http://localhost:3001";
process.env.FRONTEND_URL = "http://localhost:3000";

const transportConfigs = [];
const mockSendMail = jest.fn().mockResolvedValue({ messageId: "m1" });
const mockCreateTransport = jest.fn((cfg) => {
  transportConfigs.push(cfg);
  return { sendMail: mockSendMail };
});

jest.unstable_mockModule("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
}));

const {
  sendAppointmentConfirmationEmail,
  sendAppointmentCancellationEmail,
  sendVerificationCodeEmail,
} = await import("../../services/emailService.js");

const booking = {
  _id: "booking123",
  cancelToken: "tok-abc",
  appointmentType: "tattoo",
  startTime: "2026-07-01T15:00:00Z",
  durationMinutes: 120,
  depositPaidCents: 5000,
  finalPriceCents: 40000,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSendMail.mockResolvedValue({ messageId: "m1" });
});

describe("sendAppointmentConfirmationEmail", () => {
  test("sends a confirmation email with correct envelope and content", async () => {
    const result = await sendAppointmentConfirmationEmail(
      booking,
      "client@example.com",
      "Jane"
    );

    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const arg = mockSendMail.mock.calls[0][0];
    expect(arg.to).toBe("client@example.com");
    expect(arg.from).toBe("Inkmity <test@inkmity.com>");
    expect(arg.subject).toContain("Tattoo Session");
    expect(arg.html).toContain("Appointment confirmed");
    expect(arg.html).toContain("Jane");
    expect(arg.text).toContain("Hi Jane");
    expect(arg.html).toContain("/bookings/booking123/cancel-link?token=tok-abc");
    expect(arg.text).toContain("Duration: 120 minutes");
    expect(arg.text).toContain("Deposit paid: $50.00");
    expect(arg.text).toContain("Final price: $400.00");
  });

  test("labels consultations and omits optional rows when absent", async () => {
    await sendAppointmentConfirmationEmail(
      {
        _id: "b2",
        appointmentType: "consultation",
        startTime: "2026-07-02T10:00:00Z",
      },
      "c@example.com",
      "Bob"
    );

    const arg = mockSendMail.mock.calls[0][0];
    expect(arg.subject).toContain("Consultation");
    expect(arg.text).not.toContain("Duration:");
    expect(arg.text).not.toContain("Deposit paid:");
    expect(arg.html).toContain("/bookings/b2/cancel-link");
    expect(arg.html).not.toContain("token=");
  });
});

describe("sendAppointmentCancellationEmail", () => {
  test("sends a cancellation email with the find-an-artist CTA", async () => {
    const result = await sendAppointmentCancellationEmail(
      booking,
      "client@example.com",
      "Jane"
    );

    expect(result).toBe(true);
    const arg = mockSendMail.mock.calls[0][0];
    expect(arg.subject).toContain("Appointment cancelled");
    expect(arg.html).toContain("Appointment cancelled");
    expect(arg.html).toContain("Find an artist");
    expect(arg.text).toContain("Hi Jane, your appointment has been cancelled");
    expect(arg.html).toContain("http://localhost:3000");
  });
});

describe("sendVerificationCodeEmail", () => {
  test("sends a verification code with computed expiry minutes", async () => {
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString();
    const result = await sendVerificationCodeEmail("artist@example.com", {
      code: "482913",
      role: "artist",
      recipientName: "Alex",
      expiresAt,
      appointmentType: "tattoo",
    });

    expect(result).toBe(true);
    const arg = mockSendMail.mock.calls[0][0];
    expect(arg.to).toBe("artist@example.com");
    expect(arg.subject).toBe("Your Inkmity verification code");
    expect(arg.html).toContain("482913");
    expect(arg.text).toContain("482913");
    expect(arg.text).toContain("artist");
    expect(arg.text).toMatch(/Valid for 5 minutes/);
  });

  test("defaults expiry to 3 minutes, role to client, name to there", async () => {
    await sendVerificationCodeEmail("client@example.com", {
      code: "111111",
      appointmentType: "consultation",
    });

    const arg = mockSendMail.mock.calls[0][0];
    expect(arg.html).toContain("Hi there");
    expect(arg.text).toContain("client");
    expect(arg.text).toContain("consultation");
    expect(arg.text).toMatch(/Valid for 3 minutes/);
  });

  test("uses singular minute when one minute remains", async () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    await sendVerificationCodeEmail("client@example.com", {
      code: "222222",
      expiresAt,
    });

    const arg = mockSendMail.mock.calls[0][0];
    expect(arg.text).toMatch(/Valid for 1 minute\b/);
    expect(arg.text).not.toMatch(/Valid for 1 minutes/);
  });
});

describe("transport configuration", () => {
  test("builds a single Resend SMTP transport from the resend api key", () => {
    expect(transportConfigs).toHaveLength(1);
    expect(transportConfigs[0]).toEqual(
      expect.objectContaining({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: "re_test_key" },
      })
    );
  });
});

describe("delivery error handling", () => {
  test("returns false when the transport throws", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("smtp down"));
    const result = await sendAppointmentConfirmationEmail(
      booking,
      "fail@example.com",
      "Fail"
    );
    expect(result).toBe(false);
  });
});
