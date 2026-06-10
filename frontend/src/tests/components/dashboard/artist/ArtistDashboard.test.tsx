import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, waitFor } from "@/tests/setup/test-utils";

const mockGetDashboardData = jest.fn<() => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("react-toastify", () => ({
  toast: jest.fn(),
  ToastContainer: jest.fn(() => null),
}));

jest.unstable_mockModule("@/components/dashboard/artist/CalendarView", () => ({
  default: jest.fn(() => <div data-testid="calendar-view">Calendar</div>),
}));

jest.unstable_mockModule("@/components/dashboard/artist/ArtistOverview", () => ({
  default: jest.fn(() => <div data-testid="artist-overview">Overview</div>),
}));

jest.unstable_mockModule("@/components/dashboard/shared/ChatWindow", () => ({
  default: jest.fn(() => <div data-testid="chat-window">ChatWindow</div>),
}));

jest.unstable_mockModule("@/components/dashboard/shared/FloatingBar", () => ({
  default: jest.fn(() => <div data-testid="floating-bar">FloatingBar</div>),
}));

jest.unstable_mockModule("@/components/header/Header", () => ({
  default: jest.fn(() => <header data-testid="header">Header</header>),
}));

jest.unstable_mockModule("@/lib/socket", () => ({
  getSocket: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connected: true,
  })),
  connectSocket: jest.fn(),
  socket: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connected: true,
  },
}));

jest.unstable_mockModule("@/hooks/useRole", () => ({
  useRole: jest.fn(() => ({ role: "artist", isLoaded: true, isSignedIn: true })),
}));

jest.unstable_mockModule("@/hooks/useMessaging", () => ({
  useMessaging: jest.fn(() => ({
    conversations: [],
    messages: [],
    activeConversationId: null,
    setActiveConversationId: jest.fn(),
    sendMessage: jest.fn(),
    isLoading: false,
  })),
}));

jest.unstable_mockModule("@/api", () => ({
  getDashboardData: mockGetDashboardData,
  getMe: jest.fn<() => Promise<any>>().mockResolvedValue({ role: "artist" }),
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
  }),
  useUser: () => ({
    user: { id: "user-123" },
    isSignedIn: true,
    isLoaded: true,
  }),
}));

jest.unstable_mockModule("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/dashboard" }),
  useNavigate: () => jest.fn(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: ArtistDashboard } = await import("@/components/dashboard/artist/ArtistDashboard");

describe("ArtistDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockGetDashboardData.mockResolvedValue({
      appointments: [],
      bookings: [],
      conversations: [],
    });
  });

  test("should render artist dashboard", async () => {
    const { container } = render(<ArtistDashboard />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
