import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";

const mockTextFadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const { default: FeaturesGrid } = await import("@/components/landing/FeaturesGrid");

describe("FeaturesGrid", () => {
  test("should render features grid", () => {
    render(<FeaturesGrid textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText(/Conversations that actually move/i)).toBeInTheDocument();
  });

  test("should display all feature cards", () => {
    render(<FeaturesGrid textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText(/Booking without the back-and-forth/i)).toBeInTheDocument();
    expect(screen.getByText(/Money talk that feels simple/i)).toBeInTheDocument();
  });
});
