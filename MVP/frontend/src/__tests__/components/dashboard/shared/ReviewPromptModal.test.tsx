import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";
import type { ReviewInput } from "@/api";

const mockAddReview = jest.fn<(token: string | undefined, reviewData: ReviewInput) => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@/api", () => ({
  addReview: mockAddReview,
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
  }),
  useUser: () => ({
    user: { id: "user-123" },
    isSignedIn: true,
    isLoaded: true,
  }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  ToastContainer: () => null,
}));

const { default: ReviewPromptModal } = await import("@/components/dashboard/shared/ReviewPromptModal");

describe("ReviewPromptModal", () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    artistId: "artist-123",
    artistName: "Test Artist",
    bookingId: "booking-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockAddReview.mockResolvedValue({});
  });

  test("should render when open", () => {
    render(<ReviewPromptModal {...defaultProps} />);
    expect(screen.getByText("Write a Review (Optional)")).toBeInTheDocument();
    expect(screen.getByText(/How was your experience with Test Artist/i)).toBeInTheDocument();
  });

  test("should not render when closed", () => {
    render(<ReviewPromptModal {...defaultProps} open={false} />);
    expect(screen.queryByText("Write a Review (Optional)")).not.toBeInTheDocument();
  });

  test("should display 5 star rating buttons", async () => {
    render(<ReviewPromptModal {...defaultProps} />);
    await waitFor(() => {
      const starButtons = screen.getAllByLabelText(/Rate \d+ stars/i);
      expect(starButtons).toHaveLength(5);
    });
  });

  test("should allow selecting star rating", async () => {
    const user = userEvent.setup();
    render(<ReviewPromptModal {...defaultProps} />);

    const threeStarButton = screen.getByLabelText("Rate 3 stars");
    await user.click(threeStarButton);

    const stars = screen.getAllByRole("button", { name: /Rate \d+ stars/i });
    expect(stars[2].querySelector("svg")).toHaveClass("fill-yellow-400");
  });

  test("should have textarea for review comment", async () => {
    render(<ReviewPromptModal {...defaultProps} />);
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText("Share your experience...");
      expect(textarea).toBeInTheDocument();
    });
  });

  test("should disable submit button when comment is empty", async () => {
    render(<ReviewPromptModal {...defaultProps} />);
    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /Submit Review/i });
      expect(submitButton).toBeDisabled();
    });
  });

  test("should enable submit button when comment has text", async () => {
    const user = userEvent.setup();
    render(<ReviewPromptModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your experience...")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Share your experience...");
    await user.type(textarea, "Great experience!");

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /Submit Review/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  test("should call onClose when Skip button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ReviewPromptModal {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Skip/i })).toBeInTheDocument();
    });

    const skipButton = screen.getByRole("button", { name: /Skip/i });
    await user.click(skipButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("should submit review successfully", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockAddReview.mockResolvedValue({});

    render(<ReviewPromptModal {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your experience...")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Share your experience...");
    await user.type(textarea, "Amazing artist!");

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /Submit Review/i });
      expect(submitButton).not.toBeDisabled();
    });

    const submitButton = screen.getByRole("button", { name: /Submit Review/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAddReview).toHaveBeenCalledWith("mock-token", {
        artistClerkId: "artist-123",
        rating: 5,
        text: "Amazing artist!",
        bookingId: "booking-123",
      });
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test("should handle submit error", async () => {
    const user = userEvent.setup();
    mockAddReview.mockRejectedValue(new Error("API Error"));

    render(<ReviewPromptModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your experience...")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Share your experience...");
    await user.type(textarea, "Test review");

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /Submit Review/i });
      expect(submitButton).not.toBeDisabled();
    });

    const submitButton = screen.getByRole("button", { name: /Submit Review/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAddReview).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});