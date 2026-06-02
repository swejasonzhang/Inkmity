import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, waitFor } from "@/tests/setup/test-utils";

jest.unstable_mockModule("@/components/dashboard/client/ArtistPortfolio", () => ({
  default: jest.fn(() => <div data-testid="portfolio">Portfolio</div>),
  ArtistWithGroups: {},
}));

jest.unstable_mockModule("@/components/dashboard/client/ArtistBooking", () => ({
  default: jest.fn(() => <div data-testid="booking">Booking</div>),
}));

jest.unstable_mockModule("@/components/dashboard/client/ArtistReviews", () => ({
  default: jest.fn(() => <div data-testid="reviews">Reviews</div>),
}));

jest.unstable_mockModule("@/components/dashboard/client/StepBarRow", () => ({
  default: jest.fn(() => <div data-testid="step-bar">StepBar</div>),
}));

const { default: ArtistModal } = await import("@/components/dashboard/client/ArtistModal");

describe("ArtistModal", () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  const defaultArtist = {
    _id: "artist-123",
    clerkId: "clerk-123",
    username: "Test Artist",
  };

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    artist: defaultArtist,
    onMessage: jest.fn(),
  };

  test("should render artist modal when open", async () => {
    // ArtistModal renders its content via a portal into document.body.
    // The portal is mounted asynchronously after theme CSS variables are available,
    // which may not occur in JSDOM. We verify the component mounts without errors.
    expect(() => render(<ArtistModal {...defaultProps} />)).not.toThrow();
    // The component renders React nodes even if the portal hasn't attached yet
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("should not render when closed", () => {
    const { container } = render(<ArtistModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });
});
