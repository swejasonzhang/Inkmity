import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
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
  const defaultProps = {
    artistId: "artist-123",
    initialDate: new Date("2024-01-15"),
    selectedStart: null,
    selectedEnd: null,
    durationMinutes: 60,
    appointmentType: "tattoo_session" as const,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiGet.mockImplementation((path?: string) => {
      if (path && path.includes("/availability")) {
        return Promise.resolve([
          {
            startISO: "2024-01-15T10:00:00Z",
            endISO: "2024-01-15T11:00:00Z",
          },
          {
            startISO: "2024-01-15T14:00:00Z",
            endISO: "2024-01-15T15:00:00Z",
          },
        ]);
      }
      return Promise.resolve([]);
    });
  });

  test("should render calendar and time slots", async () => {
    render(<TimeSlotStep {...defaultProps} />);
    expect(screen.getByText(/Select Date & Time/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test("should show health instructions modal when selecting slot for tattoo_session", async () => {
    const user = userEvent.setup();
    render(<TimeSlotStep {...defaultProps} appointmentType="tattoo_session" />);

    await waitFor(() => {
      expect(screen.getByText(/Available Times/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const timeSlots = screen.getAllByRole("button");
    const slotButton = timeSlots.find((btn) => btn.textContent?.includes("10:00"));

    if (slotButton) {
      await user.click(slotButton);

      await waitFor(() => {
        expect(screen.getByText("Pre-Appointment Instructions (Required)")).toBeInTheDocument();
      }, { timeout: 3000 });
    }
  });

  test("should not show health instructions modal for consultation", async () => {
    const user = userEvent.setup();
    render(<TimeSlotStep {...defaultProps} appointmentType="consultation" />);

    await waitFor(() => {
      expect(screen.getByText(/Available Times/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const timeSlots = screen.getAllByRole("button");
    const slotButton = timeSlots.find((btn) => btn.textContent?.includes("10:00"));

    if (slotButton) {
      await user.click(slotButton);

      await waitFor(() => {
        expect(screen.queryByText("Pre-Appointment Instructions (Required)")).not.toBeInTheDocument();
      });
    }
  });

  test("should call onSelect after acknowledging health instructions", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<TimeSlotStep {...defaultProps} appointmentType="tattoo_session" onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/Available Times/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const timeSlots = screen.getAllByRole("button");
    const slotButton = timeSlots.find((btn) => btn.textContent?.includes("10:00"));

    if (slotButton) {
      await user.click(slotButton);

      await waitFor(() => {
        expect(screen.getByText("Pre-Appointment Instructions (Required)")).toBeInTheDocument();
      }, { timeout: 3000 });

      const continueButton = screen.getByRole("button", { name: /I Understand, Continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalled();
      }, { timeout: 3000 });
    }
  });
});
