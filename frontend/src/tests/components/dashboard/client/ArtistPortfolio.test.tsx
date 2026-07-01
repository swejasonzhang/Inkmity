import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";
import ArtistPortfolio from "@/components/dashboard/client/ArtistPortfolio";

const artist = {
  _id: "a1",
  username: "Inkist",
  portfolioImages: ["p1.jpg", "p2.jpg"],
  pastWorks: ["w1.jpg"],
  rating: 4.7,
  reviewsCount: 12,
  location: "Brooklyn, NY",
  yearsExperience: 6,
  styles: ["blackwork", "fineline"],
} as any;

describe("ArtistPortfolio", () => {
  test("shows the artist's work and the headline info a client browses by", () => {
    render(<ArtistPortfolio artist={artist} />);

    // their pieces are on screen
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(3);
    // and the facts a client weighs
    expect(screen.getByText(/Brooklyn, NY/i)).toBeInTheDocument();
    expect(screen.getByText(/6 yrs exp/i)).toBeInTheDocument();
  });

  test("renders nothing to browse when the artist has no work yet", () => {
    const empty = { _id: "a2", username: "New", portfolioImages: [], pastWorks: [], styles: [] } as any;
    render(<ArtistPortfolio artist={empty} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
