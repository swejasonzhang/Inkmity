import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const { default: ArtistCard } = await import("@/components/dashboard/client/ArtistCard");

describe("ArtistCard", () => {
  const mockArtist = {
    _id: "artist-123",
    username: "Test Artist",
    bio: "A test artist",
    location: "New York",
    styles: ["realism", "traditional"],
    profileImage: "http://example.com/profile.jpg",
    coverImage: "http://example.com/cover.jpg",
    rating: 4.5,
    reviewsCount: 10,
  };

  const defaultProps = {
    artist: mockArtist,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render artist card", () => {
    render(<ArtistCard {...defaultProps} />);
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
  });

  test("should display artist location", () => {
    render(<ArtistCard {...defaultProps} />);
    expect(screen.getByText("New York")).toBeInTheDocument();
  });

  test("should call onClick when card is clicked", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<ArtistCard {...defaultProps} onClick={onClick} />);

    const button = screen.queryByTestId("view-portfolio-button");
    if (button) {
      await user.click(button);
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(onClick).toHaveBeenCalled();
    } else {
      const card = screen.getByTestId("artist-card");
      if (card) {
        await user.click(card);
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(onClick).toHaveBeenCalled();
      }
    }
  });
});
