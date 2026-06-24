import { jest, describe, test, expect } from "@jest/globals";
import { render, waitFor } from "@/tests/setup/test-utils";

jest.unstable_mockModule("@/components/calendar/BookingPicker", () => ({
  default: jest.fn(() => <div data-testid="booking-picker">Booking Picker</div>),
}));

const mockGetToken = async () => "mock-token";
const mockUser = { id: "user-123" };
jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useUser: () => ({ user: mockUser, isLoaded: true }),
  useAuth: () => ({ getToken: mockGetToken }),
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

  test("should render artist booking", async () => {
    const { container } = render(<ArtistBooking {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
});
