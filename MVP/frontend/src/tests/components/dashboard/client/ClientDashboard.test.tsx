import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, waitFor } from "@/__tests__/setup/test-utils";

const mockGetDashboardData = jest.fn<() => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@/api", () => ({
  getDashboardData: mockGetDashboardData,
  getMe: jest.fn<() => Promise<any>>().mockResolvedValue({ role: "client" }),
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

const { default: ClientDashboard } = await import("@/components/dashboard/client/ClientDashboard");

describe("ClientDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockGetDashboardData.mockResolvedValue({
      appointments: [],
      artists: [],
      conversations: [],
    });
  });

  test("should render client dashboard", async () => {
    const { container } = render(<ClientDashboard />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
