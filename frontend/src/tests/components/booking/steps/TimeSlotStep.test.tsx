import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockApiGet = jest.fn<(path: string, params?: any, token?: string, signal?: AbortSignal) => Promise<any>>();

jest.unstable_mockModule("@/api", () => ({
  apiGet: mockApiGet,
  apiPost: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  apiRequest: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  useApi: jest.fn(() => ({
    apiGet: mockApiGet,
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
  createMultiSession: jest.fn(),
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

const { default: TimeSlotStep } = await import("@/components/booking/steps/TimeSlotStep");

describe("TimeSlotStep", () => {
  // A future day with a wide availability block so generated session slots are
  // in the future (the component hides past times).
  const futureBase = new Date(Date.now() + 7 * 86400000);
  futureBase.setHours(10, 0, 0, 0);
  const blockEnd = new Date(futureBase);
  blockEnd.setHours(16, 0, 0, 0);

  const defaultProps = {
    artistId: "artist-123",
    initialDate: futureBase,
    appointmentType: "tattoo_session" as const,
    sessions: [] as Array<{ startISO: string; endISO: string }>,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiGet.mockImplementation((path?: string) => {
      if (path && path.includes("/availability")) {
        return Promise.resolve([
          { startISO: futureBase.toISOString(), endISO: blockEnd.toISOString() },
        ]);
      }
      return Promise.resolve([]);
    });
  });

  const findSlotButton = () =>
    screen.getAllByRole("button").find((b: HTMLElement) => /\b(AM|PM)\b/.test(b.textContent || ""));

  test("should render and load availability", async () => {
    render(<TimeSlotStep {...defaultProps} />);
    expect(screen.getByText(/Select Date & Time/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test("should show the session length options for tattoo sessions", async () => {
    render(<TimeSlotStep {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /session length/i })).toBeInTheDocument();
  });

  test("clicking a time slot calls onToggle", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(<TimeSlotStep {...defaultProps} onToggle={onToggle} />);

    await waitFor(() => {
      expect(findSlotButton()).toBeTruthy();
    }, { timeout: 3000 });

    await user.click(findSlotButton()!);
    expect(onToggle).toHaveBeenCalled();
  });
});
