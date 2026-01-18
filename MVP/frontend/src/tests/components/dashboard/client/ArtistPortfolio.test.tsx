import { jest, describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("@/components/dashboard/client/FullscreenZoom", () => ({
  default: jest.fn(() => <div data-testid="zoom">Zoom</div>),
}));

const { default: ArtistPortfolio } = await import("@/components/dashboard/client/ArtistPortfolio");

describe("ArtistPortfolio", () => {
  const defaultArtist = {
    _id: "artist-123",
    clerkId: "clerk-123",
    username: "Test Artist",
    portfolioImages: ["image1.jpg", "image2.jpg"],
  };

  test("should render artist portfolio", () => {
    const { container } = render(<ArtistPortfolio artist={defaultArtist} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
