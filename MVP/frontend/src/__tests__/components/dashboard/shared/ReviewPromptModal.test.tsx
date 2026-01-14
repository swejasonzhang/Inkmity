import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";
import ReviewPromptModal from "@/components/dashboard/shared/ReviewPromptModal";
import * as api from "@/api";
import { useAuth } from "@clerk/clerk-react";

jest.mock("@/api");
jest.mock("@clerk/clerk-react");
jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockGetToken = jest.fn();
(useAuth as jest.Mock).mockReturnValue({
  getToken: mockGetToken,
} as any);

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
    (api.addReview as jest.Mock).mockResolvedValue({} as any);
    
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
      expect(api.addReview).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  test("should handle submit error", async () => {
    const user = userEvent.setup();
    (api.addReview as jest.Mock).mockRejectedValue(new Error("API Error"));
    
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
      expect(api.addReview).toHaveBeenCalled();
    });
  });
});

