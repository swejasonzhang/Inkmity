import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

const mockTextFadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const { default: ForArtists } = await import("@/components/landing/ForArtists");

describe("ForArtists", () => {
  test("renders the section heading and intro copy", () => {
    render(<ForArtists textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText(/For tattoo artists/i)).toBeInTheDocument();
    expect(screen.getByText(/Built for artists/i)).toBeInTheDocument();
  });

  test("renders all four artist benefits", () => {
    render(<ForArtists textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText("One inbox")).toBeInTheDocument();
    expect(screen.getByText("Automated deposits")).toBeInTheDocument();
    expect(screen.getByText("Client intake forms")).toBeInTheDocument();
    expect(screen.getByText("Portfolio showcase")).toBeInTheDocument();
  });

  test("renders a Join as an artist link pointing to signup", () => {
    render(<ForArtists textFadeUp={mockTextFadeUp} />);
    const link = screen.getByRole("link", { name: /Join as an artist/i });
    expect(link).toHaveAttribute("href", "/signup");
  });

  test("applies the wc style override when provided", () => {
    render(<ForArtists textFadeUp={mockTextFadeUp} wc={{ color: "rgb(1, 2, 3)" }} />);
    const heading = screen.getByText(/Built for artists/i);
    expect(heading).toHaveStyle({ color: "rgb(1, 2, 3)" });
  });
});
