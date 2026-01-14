import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import type { Booking } from "@/api";

const mockApiGet = jest.fn<() => Promise<Array<{ startISO: string; endISO: string }>>>();
const mockApiPost = jest.fn<() => Promise<Booking>>();
const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@/api", () => ({
  apiGet: mockApiGet,
  apiPost: mockApiPost,
  apiRequest: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  useApi: jest.fn(() => ({
    apiGet: mockApiGet,
    apiPost: mockApiPost,
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
  getArtistPolicy: jest.fn(),
  updateArtistPolicy: jest.fn(),
  getBookingGate: jest.fn(),
  enableClientBookings: jest.fn(),
  checkConsultationStatus: jest.fn(),
  API_URL: "http://localhost:5005",
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    userId: "user-123",
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

jest.unstable_mockModule("@/lib/socket", () => ({
  socket: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    connected: true,
  },
  connectSocket: jest.fn(),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  ToastContainer: () => null,
}));

const { default: BookingPicker } = await import("@/components/calender/BookingPicker");

describe("BookingPicker", () => {
  const defaultProps = {
    artistId: "artist-123",
    date: new Date("2024-01-15"),
    artistName: "Test Artist",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockApiGet.mockResolvedValue([
      {
        startISO: "2024-01-15T10:00:00Z",
        endISO: "2024-01-15T11:00:00Z",
      },
    ]);
    mockApiPost.mockResolvedValue({
      _id: "booking-123",
      artistId: "artist-123",
      clientId: "client-123",
      appointmentType: "consultation",
      status: "pending",
      depositRequiredCents: 0,
      depositPaidCents: 0,
    } as Booking);
  });

  test("should render booking picker", () => {
    render(<BookingPicker {...defaultProps} />);
    expect(screen.getByText(/Select a time above/i)).toBeInTheDocument();
  });

  test("should render time slots", async () => {
    render(<BookingPicker {...defaultProps} artistName="Test Artist" />);

    await waitFor(() => {
      expect(screen.getByText(/Select a time above/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test("should not show review modal initially", async () => {
    render(<BookingPicker {...defaultProps} artistName="Test Artist" />);

    await waitFor(() => {
      expect(screen.getByText(/Select a time above/i)).toBeInTheDocument();
    });

    expect(screen.queryByText("Write a Review (Optional)")).not.toBeInTheDocument();
  });
});
