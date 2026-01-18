import { describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const { default: ArtistReviews } = await import("@/components/dashboard/client/ArtistReviews");

describe("ArtistReviews", () => {
  const defaultArtist = {
    _id: "artist-123",
    clerkId: "clerk-123",
    username: "Test Artist",
  };

  test("should render artist reviews", () => {
    const { container } = render(<ArtistReviews artist={defaultArtist} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
