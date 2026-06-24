import { describe, test, expect } from "@jest/globals";
import { render, waitFor } from "@/tests/setup/test-utils";

const { default: ArtistReviews } = await import("@/components/dashboard/client/ArtistReviews");

describe("ArtistReviews", () => {
  const defaultArtist = {
    _id: "artist-123",
    clerkId: "clerk-123",
    username: "Test Artist",
  };

  test("should render artist reviews", async () => {
    const { container } = render(<ArtistReviews artist={defaultArtist} />);
    expect(container.firstChild).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
});
