import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

const mockTextFadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const { default: FeaturesGrid } = await import("@/components/landing/FeaturesGrid");

describe("FeaturesGrid", () => {
  test("should render features grid", () => {
    render(<FeaturesGrid textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText(/Search that understands style/i)).toBeInTheDocument();
  });

  test("should display all feature cards", () => {
    render(<FeaturesGrid textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText(/Chat with full context/i)).toBeInTheDocument();
    expect(screen.getByText(/Clear pricing and rewards/i)).toBeInTheDocument();
  });
});
