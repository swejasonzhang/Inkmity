import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../../setup/test-utils";
import userEvent from "@testing-library/user-event";
import BookingPicker from "@/components/calender/BookingPicker";
import * as api from "@/api";

vi.mock("@/api");
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("mock-token"),
    userId: "user-123",
  }),
}));
vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
  }),
}));
vi.mock("@/lib/socket", () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    connected: true,
  },
  connectSocket: vi.fn(),
}));
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  ToastContainer: () => null,
}));

describe("BookingPicker", () => {
  const defaultProps = {
    artistId: "artist-123",
    date: new Date("2024-01-15"),
    artistName: "Test Artist",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.apiGet).mockResolvedValue([
      {
        startISO: "2024-01-15T10:00:00Z",
        endISO: "2024-01-15T11:00:00Z",
      },
    ]);
  });

  it("should render booking picker", () => {
    render(<BookingPicker {...defaultProps} />);
    expect(screen.getByText(/Select a time above/i)).toBeInTheDocument();
  });

  it("should show review modal after successful appointment booking", async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiPost).mockResolvedValue({
      _id: "booking-123",
      depositRequiredCents: 0,
      depositPaidCents: 0,
    } as any);
    
    render(<BookingPicker {...defaultProps} artistName="Test Artist" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Select a time above/i)).toBeInTheDocument();
    });
    
    const timeButtons = screen.getAllByRole("button");
    const timeButton = timeButtons.find((btn) => 
      btn.textContent?.match(/\d{1,2}:\d{2}/)
    );
    
    if (timeButton) {
      await user.click(timeButton);
      
      const confirmButton = screen.getByRole("button", { name: /Confirm/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(api.apiPost).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(screen.getByText("Write a Review (Optional)")).toBeInTheDocument();
      }, { timeout: 2000 });
    }
  });

  it("should not show review modal for consultations", async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiPost).mockResolvedValue({
      _id: "booking-123",
    } as any);
    
    render(<BookingPicker {...defaultProps} artistName="Test Artist" />);
    
    await waitFor(() => {
      const consultationButton = screen.getByText(/consultation/i);
      if (consultationButton) {
        user.click(consultationButton);
      }
    });
    
    await waitFor(() => {
      expect(screen.queryByText("Write a Review (Optional)")).not.toBeInTheDocument();
    });
  });
});

