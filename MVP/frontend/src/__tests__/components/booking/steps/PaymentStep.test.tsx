import { render, screen, waitFor } from "../../../setup/test-utils";
import userEvent from "@testing-library/user-event";
import PaymentStep from "@/components/booking/steps/PaymentStep";
import * as api from "@/api";

jest.mock("@/api");
jest.mock("@stripe/stripe-js", () => ({
  loadStripe: jest.fn(() => Promise.resolve(null)),
}));

const mockBookingData = {
  appointmentType: "tattoo_session" as const,
  artistId: "artist-123",
  startISO: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  endISO: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  durationMinutes: 120,
  priceCents: 20000,
  projectId: null,
  sessionNumber: 1,
  referenceImageIds: [],
  intakeForm: {
    consent: {
      ageVerification: true,
      healthDisclosure: true,
      aftercareInstructions: true,
      depositPolicy: true,
      cancellationPolicy: true,
    },
  },
};

const mockArtist = {
  _id: "artist-123",
  clerkId: "artist-123",
  username: "Test Artist",
};

describe("PaymentStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should display appointment summary", () => {
    render(
      <PaymentStep
        bookingData={mockBookingData}
        artist={mockArtist}
        onSubmit={() => {}}
        submitting={false}
      />
    );

    expect(screen.getByText(/Appointment Summary/i)).toBeInTheDocument();
    expect(screen.getByText(mockArtist.username)).toBeInTheDocument();
  });

  test("should display deposit amount for tattoo sessions", () => {
    render(
      <PaymentStep
        bookingData={mockBookingData}
        artist={mockArtist}
        onSubmit={() => {}}
        submitting={false}
      />
    );

    expect(screen.getByText(/Deposit Required/i)).toBeInTheDocument();
    expect(screen.getByText(/\$40\.00/)).toBeInTheDocument();
  });

  test("should display deposit policy notice", () => {
    render(
      <PaymentStep
        bookingData={mockBookingData}
        artist={mockArtist}
        onSubmit={() => {}}
        submitting={false}
      />
    );

    expect(screen.getByText(/Deposit Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/non-refundable/i)).toBeInTheDocument();
  });

  test("should not render CardElement when no deposit required", () => {
    const consultationData = {
      ...mockBookingData,
      appointmentType: "consultation" as const,
      priceCents: 0,
    };

    render(
      <PaymentStep
        bookingData={consultationData}
        artist={mockArtist}
        onSubmit={() => {}}
        submitting={false}
      />
    );

    expect(screen.queryByText(/Card Details/i)).not.toBeInTheDocument();
  });

  test("should call createTattooSession API for tattoo sessions", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const mockBooking = {
      _id: "booking-123",
      ...mockBookingData,
      status: "pending" as const,
    };

    jest.mocked(api.createTattooSession).mockResolvedValue(mockBooking);
    jest.mocked(api.createDepositPaymentIntent).mockResolvedValue({
      clientSecret: "pi_test_secret",
      paymentIntentId: "pi_test",
      billingId: "billing-123",
    });

    render(
      <PaymentStep
        bookingData={mockBookingData}
        artist={mockArtist}
        onSubmit={onSubmit}
        submitting={false}
      />
    );

    const submitButton = screen.getByRole("button", { name: /Pay Deposit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.createTattooSession).toHaveBeenCalled();
    });
  });

  test("should display loading state during submission", async () => {
    const user = userEvent.setup();
    jest.mocked(api.createTattooSession).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <PaymentStep
        bookingData={mockBookingData}
        artist={mockArtist}
        onSubmit={() => {}}
        submitting={false}
      />
    );

    const submitButton = screen.getByRole("button", { name: /Pay Deposit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Processing/i)).toBeInTheDocument();
    });
  });
});
