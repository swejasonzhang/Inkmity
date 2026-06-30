import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

const mockTextFadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const { default: HowItWorks } = await import("@/components/landing/HowItWorks");

describe("HowItWorks", () => {
  test("renders the section eyebrow and heading", () => {
    render(<HowItWorks textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText(/From idea to appointment/i)).toBeInTheDocument();
  });

  test("renders all three steps with their numbers", () => {
    render(<HowItWorks textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText("Browse & Discover")).toBeInTheDocument();
    expect(screen.getByText("Book & Confirm")).toBeInTheDocument();
    expect(screen.getByText("Show Up & Earn")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("applies the wc style override to text", () => {
    render(<HowItWorks textFadeUp={mockTextFadeUp} wc={{ color: "rgb(4, 5, 6)" }} />);
    expect(screen.getByText("How it works")).toHaveStyle({ color: "rgb(4, 5, 6)" });
  });
});
