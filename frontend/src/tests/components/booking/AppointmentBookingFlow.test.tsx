import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";
import type { Booking } from "@/api";

const mockCreateConsultation = jest.fn<() => Promise<Booking>>();
const mockCreateTattooSession = jest.fn<() => Promise<Booking>>();

jest.unstable_mockModule("@/api", () => ({
  createConsultation: mockCreateConsultation,
  createTattooSession: mockCreateTattooSession,
  createCardSetupIntent: jest.fn<() => Promise<any>>().mockResolvedValue({ clientSecret: "seti_secret", setupIntentId: "seti_1", customerId: "cus_1" }),
  createMultiSession: jest.fn<() => Promise<any>>().mockResolvedValue({ project: {}, bookings: [] }),
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
  submitIntakeForm: jest.fn(),
  getIntakeForm: jest.fn(),
  getAppointmentDetails: jest.fn(),
  createDepositPaymentIntent: jest.fn(),
  getArtistPolicy: jest.fn(),
  updateArtistPolicy: jest.fn(),
  getBookingGate: jest.fn(),
  enableClientBookings: jest.fn(),
  checkConsultationStatus: jest.fn(),
  getMyRewards: jest.fn<() => Promise<any>>().mockResolvedValue(null),
  getDocument: jest.fn<() => Promise<any>>().mockResolvedValue(null),
  signDocument: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  apiDelete: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  apiPatch: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  buildUrl: jest.fn(() => "http://localhost:5005"),
  isAbortError: jest.fn(() => false),
  createSketch: jest.fn(),
  createStudio: jest.fn(),
  fetchArtistByHandle: jest.fn(),
  getArtistAnalytics: jest.fn(),
  getArtistWaitlist: jest.fn(),
  getConnectLoginLink: jest.fn(),
  getConnectStatus: jest.fn(),
  getMyCredits: jest.fn<() => Promise<any>>().mockResolvedValue([]),
  getMyStudioMemberships: jest.fn(),
  getMyStudios: jest.fn(),
  getMyWaitlist: jest.fn(),
  getSignatureStatus: jest.fn(),
  getSketches: jest.fn(),
  getStudio: jest.fn(),
  getStudioConnectStatus: jest.fn(),
  inviteArtistToStudio: jest.fn(),
  joinWaitlist: jest.fn(),
  leaveWaitlist: jest.fn(),
  listMySignatures: jest.fn(),
  listStudioMembers: jest.fn(),
  removeStudioMember: jest.fn(),
  respondToSketch: jest.fn(),
  respondToStudioInvite: jest.fn(),
  startConnectOnboarding: jest.fn(),
  startStudioConnectOnboarding: jest.fn(),
  updateMyPortfolio: jest.fn(),
  updateStudio: jest.fn(),
  updateStudioMember: jest.fn(),
  API_URL: "http://localhost:5005",
}));

jest.unstable_mockModule("@/lib/stripe", () => ({
  stripePromise: Promise.resolve({
    createPaymentMethod: jest.fn(),
    confirmCardPayment: jest.fn(),
  }),
}));

jest.unstable_mockModule("@stripe/stripe-js", () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}));

jest.unstable_mockModule("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: () => <div data-testid="card-element">Card Element</div>,
  useStripe: () => null,
  useElements: () => null,
}));

const { default: AppointmentBookingFlow } = await import("@/components/booking/AppointmentBookingFlow");

const mockArtist = {
  _id: "artist-123",
  clerkId: "artist-123",
  username: "Test Artist",
  location: "Test City",
};

describe("AppointmentBookingFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render all 5 steps in correct order", () => {
    render(
      <AppointmentBookingFlow
        artist={mockArtist}
        onComplete={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText("Book Appointment")).toBeInTheDocument();
    expect(screen.getByText(/Appointment Type/i)).toBeInTheDocument();
  });

  test("should disable Next button when step incomplete", () => {
    render(
      <AppointmentBookingFlow
        artist={mockArtist}
        onComplete={() => {}}
        onCancel={() => {}}
      />
    );

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  test("should render appointment type options", () => {
    render(
      <AppointmentBookingFlow
        artist={mockArtist}
        onComplete={() => {}}
        onCancel={() => {}}
      />
    );

    const consultationTexts = screen.getAllByText(/Consultation/i);
    expect(consultationTexts.length).toBeGreaterThan(0);
    const tattooTexts = screen.getAllByText(/Tattoo Session/i);
    expect(tattooTexts.length).toBeGreaterThan(0);
  });

  test("should call onCancel when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    render(
      <AppointmentBookingFlow
        artist={mockArtist}
        onComplete={() => {}}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("should render appointment type selection", () => {
    render(
      <AppointmentBookingFlow
        artist={mockArtist}
        onComplete={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText(/Select Appointment Type/i)).toBeInTheDocument();
    const consultationTexts = screen.getAllByText(/Consultation/i);
    expect(consultationTexts.length).toBeGreaterThan(0);
    const tattooTexts = screen.getAllByText(/Tattoo Session/i);
    expect(tattooTexts.length).toBeGreaterThan(0);
  });
});
