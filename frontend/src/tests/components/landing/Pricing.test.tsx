import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

const mockTextFadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const { default: Pricing } = await import("@/components/landing/Pricing");

describe("Pricing", () => {
  test("renders the pricing eyebrow and heading", () => {
    render(<Pricing textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText(/Honest pricing\. No hidden fees\./i)).toBeInTheDocument();
  });

  test("renders all four pricing points", () => {
    render(<Pricing textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText(/The essentials are always free/i)).toBeInTheDocument();
    expect(screen.getByText(/We only earn when you book/i)).toBeInTheDocument();
    expect(screen.getByText(/We bring the clients/i)).toBeInTheDocument();
    expect(screen.getByText(/Premium is optional, never essential/i)).toBeInTheDocument();
  });

  test("links to the tiers page for the full fee breakdown", () => {
    render(<Pricing textFadeUp={mockTextFadeUp} />);
    const link = screen.getByRole("link", { name: /tiers page/i });
    expect(link).toHaveAttribute("href", "/tiers");
  });

  test("applies the wc style override", () => {
    render(<Pricing textFadeUp={mockTextFadeUp} wc={{ color: "rgb(7, 8, 9)" }} />);
    expect(screen.getByText("Pricing")).toHaveStyle({ color: "rgb(7, 8, 9)" });
  });
});
