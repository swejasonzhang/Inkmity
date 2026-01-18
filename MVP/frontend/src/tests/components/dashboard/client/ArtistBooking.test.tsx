import { jest, describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("@/components/calender/BookingPicker", () => ({
  default: jest.fn(() => <div data-testid="booking-picker">Booking Picker</div>),
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { id: "user-123" }, isLoaded: true }),
  useAuth: () => ({
    getToken: async () => "mock-token",
  }),
}));

const { default: ArtistBooking } = await import("@/components/dashboard/client/ArtistBooking");

describe("ArtistBooking", () => {
  const defaultArtist = {
    _id: "artist-123",
    clerkId: "clerk-123",
    username: "Test Artist",
  };

  const defaultProps = {
    artist: defaultArtist as any,
    onMessage: () => {},
    onClose: () => {},
  };

  test("should render artist booking", () => {
    const { container } = render(<ArtistBooking {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
