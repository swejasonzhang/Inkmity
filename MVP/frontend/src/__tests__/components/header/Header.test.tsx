import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";

const mockSignOut = jest.fn();
const mockGetToken = jest.fn<() => Promise<string>>();
const mockUpdateVisibility = jest.fn<() => Promise<any>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useClerk: () => ({
    signOut: mockSignOut,
  }),
  useUser: () => ({
    user: { id: "user-123", firstName: "Test", lastName: "User" },
    isSignedIn: true,
    isLoaded: true,
  }),
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}));

jest.unstable_mockModule("@/api", () => ({
  updateVisibility: mockUpdateVisibility,
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

jest.unstable_mockModule("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: jest.fn(),
    logoSrc: "/logo.png",
  }),
}));

jest.unstable_mockModule("@/lib/socket", () => ({
  getSocket: () => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connected: true,
  }),
}));

jest.unstable_mockModule("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/dashboard" }),
  useNavigate: () => jest.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: Header } = await import("@/components/header/Header");

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
  });

  test("should render header", () => {
    render(<Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  test("should render navigation", () => {
    render(<Header />);
    expect(screen.getByText(/Landing/i)).toBeInTheDocument();
  });
});
