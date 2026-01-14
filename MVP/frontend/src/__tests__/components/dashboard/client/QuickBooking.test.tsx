import { jest, describe, test, expect } from "@jest/globals";
import { render, waitFor } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("@/components/calender/BookingPicker", () => ({
  default: jest.fn(() => <div data-testid="booking-picker">Booking Picker</div>),
}));

const { default: QuickBooking } = await import("@/components/dashboard/client/QuickBooking");

describe("QuickBooking", () => {
  const defaultProps = {
    open: true,
    artist: {
      _id: "artist-123",
      clerkId: "artist-123",
      username: "Test Artist",
    } as any,
    onClose: jest.fn<() => void>(),
  };

  test("should render quick booking when open", async () => {
    render(<QuickBooking {...defaultProps} />);
    await waitFor(() => {
      const portal = document.querySelector('[role="dialog"]');
      expect(portal).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("should not render when closed", () => {
    const { container } = render(<QuickBooking {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });
});
