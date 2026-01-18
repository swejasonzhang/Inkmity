import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import type { Artist, Booking } from "@/api";

const mockCreateTattooSession = jest.fn<() => Promise<Booking>>();
const mockCreateDepositPaymentIntent = jest.fn<() => Promise<any>>();
const mockGetArtistPolicy = jest.fn<() => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@/api", () => ({
  createTattooSession: mockCreateTattooSession,
  createDepositPaymentIntent: mockCreateDepositPaymentIntent,
  getArtistPolicy: mockGetArtistPolicy,
  createConsultation: jest.fn(),
  submitIntakeForm: jest.fn(),
  apiGet: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  apiPost: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  apiRequest: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  useApi: jest.fn(() => ({
    apiGet: jest.fn<() => Promise<any>>().mockResolvedValue({}),
    apiPost: jest.fn<() => Promise<any>>().mockResolvedValue({}),
    request: jest.fn<() => Promise<any>>().mockResolvedValue({}),
    API_URL: "http://localhost:5005",
  })),
  fetchArtists: jest.fn(),
  fetchArtistById: jest.fn(),
  getDashboardData: jest.fn(),
  addReview: jest.fn(),
  fetchConversations: jest.fn(),
  sendMessage: jest.fn(),
  deleteConversation: jest.fn(),
  listBookingsForDay: jest.fn(),
  createBooking: jest.fn(),
  cancelBooking: jest.fn(),
  completeBooking: jest.fn(),
  getBooking: jest.fn(),
  startCheckout: jest.fn(),
  checkoutDeposit: jest.fn(),
  refundByBooking: jest.fn(),
  getMe: jest.fn(),
  updateVisibility: jest.fn(),
  syncUser: jest.fn(),
  rescheduleAppointment: jest.fn(),
  getAppointments: jest.fn(),
  acceptAppointment: jest.fn(),
  denyAppointment: jest.fn(),
  markNoShow: jest.fn(),
  getIntakeForm: jest.fn(),
  getAppointmentDetails: jest.fn(),
  updateArtistPolicy: jest.fn(),
  getBookingGate: jest.fn(),
  enableClientBookings: jest.fn(),
  checkConsultationStatus: jest.fn(),
  API_URL: "http://localhost:5005",
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
  useUser: () => ({
    user: { id: "user-123" },
    isSignedIn: true,
    isLoaded: true,
  }),
}));

jest.unstable_mockModule("@stripe/stripe-js", () => ({
  loadStripe: jest.fn(() => Promise.resolve({
    createPaymentMethod: jest.fn(),
    confirmCardPayment: jest.fn(),
  })),
}));

jest.unstable_mockModule("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: () => <div data-testid="card-element">Card Element</div>,
  useStripe: () => ({
    createPaymentMethod: jest.fn<() => Promise<any>>().mockResolvedValue({
      paymentMethod: { id: "pm_test" },
    } as any),
    confirmCardPayment: jest.fn<() => Promise<any>>().mockResolvedValue({
      paymentIntent: { status: "succeeded" },
    } as any),
  }),
  useElements: () => ({
    getElement: jest.fn(),
  }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  ToastContainer: () => null,
}));

const { default: PaymentStep } = await import("@/components/booking/steps/PaymentStep");

const mockArtist: Artist = {
  _id: "artist-123",
  clerkId: "artist-123",
  username: "Test Artist",
  location: "Test City",
  styles: ["realism"],
  yearsExperience: 5,
  baseRate: 10000,
  rating: 4.5,
  reviewsCount: 10,
  bookingPreference: "open",
  travelFrequency: "rare",
  createdAt: new Date().toISOString(),
};

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

describe("PaymentStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockGetArtistPolicy.mockResolvedValue({ deposit: null });
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

  test("should display deposit amount for tattoo sessions", async () => {
    render(
      <PaymentStep
        bookingData={mockBookingData}
        artist={mockArtist}
        onSubmit={() => {}}
        submitting={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Deposit Required")).toBeInTheDocument();
    });
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

  test("should render submit button for tattoo sessions", async () => {
    render(
      <PaymentStep
        bookingData={mockBookingData}
        artist={mockArtist}
        onSubmit={() => {}}
        submitting={false}
      />
    );

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /Deposit|Complete/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  test("should handle submission state", () => {
    render(
      <PaymentStep
        bookingData={mockBookingData}
        artist={mockArtist}
        onSubmit={() => {}}
        submitting={true}
      />
    );

    const buttons = screen.getAllByRole("button");
    const submitButton = buttons.find(btn => 
      btn.textContent?.includes("Deposit") || 
      btn.textContent?.includes("Complete") ||
      btn.textContent?.includes("Processing")
    );
    expect(submitButton).toBeDefined();
  });
});
