import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/__tests__/setup/test-utils";

const mockGetArtistPolicy = jest.fn<() => Promise<any>>();
const mockUpdateArtistPolicy = jest.fn<() => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@/api", () => ({
  getArtistPolicy: mockGetArtistPolicy,
  updateArtistPolicy: mockUpdateArtistPolicy,
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
  createConsultation: jest.fn(),
  createTattooSession: jest.fn(),
  rescheduleAppointment: jest.fn(),
  getAppointments: jest.fn(),
  acceptAppointment: jest.fn(),
  denyAppointment: jest.fn(),
  markNoShow: jest.fn(),
  submitIntakeForm: jest.fn(),
  getIntakeForm: jest.fn(),
  getAppointmentDetails: jest.fn(),
  createDepositPaymentIntent: jest.fn(),
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

jest.unstable_mockModule("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
  }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  ToastContainer: () => null,
}));

const { default: DepositPolicyModal } = await import("@/components/dashboard/shared/DepositPolicyModal");

describe("DepositPolicyModal", () => {
  const defaultProps = {
    artistId: "artist-123",
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockGetArtistPolicy.mockResolvedValue({ deposit: null });
    mockUpdateArtistPolicy.mockResolvedValue({});
  });

  test("should render when open", () => {
    render(<DepositPolicyModal {...defaultProps} />);
    expect(screen.getByText(/Deposit Policy/i)).toBeInTheDocument();
  });

  test("should not render when closed", () => {
    render(<DepositPolicyModal {...defaultProps} open={false} />);
    expect(screen.queryByText(/Deposit Policy/i)).not.toBeInTheDocument();
  });

  test("should load existing policy when opened", async () => {
    mockGetArtistPolicy.mockResolvedValue({
      deposit: {
        mode: "percent",
        percent: 0.2,
        amountCents: 5000,
      },
    });

    render(<DepositPolicyModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetArtistPolicy).toHaveBeenCalled();
    });
  });
});
