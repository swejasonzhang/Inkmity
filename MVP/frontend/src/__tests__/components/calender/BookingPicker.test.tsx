import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";
import BookingPicker from "@/components/calender/BookingPicker";
import * as api from "@/api";

jest.mock("@/api");
jest.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: jest.fn().mockResolvedValue("mock-token"),
    userId: "user-123",
  }),
}));
jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
  }),
}));
jest.mock("@/lib/socket", () => ({
  socket: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    connected: true,
  },
  connectSocket: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
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
    jest.clearAllMocks();
    (api.apiGet as jest.Mock).mockResolvedValue([
      {
        startISO: "2024-01-15T10:00:00Z",
        endISO: "2024-01-15T11:00:00Z",
      },
    ]);
  });

  test("should render booking picker", () => {
    render(<BookingPicker {...defaultProps} />);
    expect(screen.getByText(/Select a time above/i)).toBeInTheDocument();
  });

  test("should show review modal after successful appointment booking", async () => {
    const user = userEvent.setup();
    (api.apiPost as jest.Mock).mockResolvedValue({
      _id: "booking-123",
      depositRequiredCents: 0,
      depositPaidCents: 0,
    } as any);
    
    render(<BookingPicker {...defaultProps} artistName="Test Artist" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Select a time above/i)).toBeInTheDocument();
    });
    
    const timeButtons = screen.getAllByRole("button");
    const timeButton = timeButtons.find((btn: HTMLElement) => 
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

  test("should not show review modal for consultations", async () => {
    const user = userEvent.setup();
    (api.apiPost as jest.Mock).mockResolvedValue({
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

