import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockGetToken = jest.fn<() => Promise<string>>();
const mockCheckoutDeposit = jest.fn<() => Promise<any>>();
const mockGetBooking = jest.fn<() => Promise<any>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}));

jest.unstable_mockModule("@/api/index.ts", () => ({
  checkoutDeposit: mockCheckoutDeposit,
  getBooking: mockGetBooking,
}));

jest.unstable_mockModule("@/api", () => ({
  checkoutDeposit: mockCheckoutDeposit,
  getBooking: mockGetBooking,
}));

jest.unstable_mockModule("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: jest.fn(),
  }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const { default: DepositStep } = await import("@/components/calender/DepositStep");

describe("DepositStep", () => {
  const defaultBooking = {
    _id: "booking-123",
    artistId: "artist-123",
    startAt: "2024-01-01T10:00:00Z",
    endAt: "2024-01-01T12:00:00Z",
    depositRequiredCents: 5000,
    depositPaidCents: 0,
  };

  const defaultProps = {
    booking: defaultBooking,
    onDepositPaid: jest.fn<() => void>(),
    onCancel: jest.fn<() => void>(),
    artistName: "Test Artist",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockGetBooking.mockResolvedValue(defaultBooking);
  });

  test("should render deposit step", () => {
    render(<DepositStep {...defaultProps} />);
    const headings = screen.getAllByText(/Deposit Required/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  test("should display deposit amount", () => {
    render(<DepositStep {...defaultProps} />);
    expect(screen.getByText(/\$50\.00/i)).toBeInTheDocument();
  });

  test("should call onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<DepositStep {...defaultProps} onCancel={onCancel} />);
    
    const cancelButton = screen.getByText(/Cancel/i);
    await user.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });
});
