import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../../setup/test-utils";
import userEvent from "@testing-library/user-event";
import PaymentStep from "@/components/booking/steps/PaymentStep";
import * as api from "@/api";

vi.mock("@/api");
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
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
    vi.clearAllMocks();
  });

  it("should display appointment summary", () => {
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

  it("should display deposit amount for tattoo sessions", () => {
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

  it("should display deposit policy notice", () => {
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

  it("should not render CardElement when no deposit required", () => {
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

  it("should call createTattooSession API for tattoo sessions", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const mockBooking = {
      _id: "booking-123",
      ...mockBookingData,
      status: "pending" as const,
    };

    vi.mocked(api.createTattooSession).mockResolvedValue(mockBooking);
    vi.mocked(api.createDepositPaymentIntent).mockResolvedValue({
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

  it("should display loading state during submission", async () => {
    const user = userEvent.setup();
    vi.mocked(api.createTattooSession).mockImplementation(
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

