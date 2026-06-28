import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";
import VerifiedBadge from "@/components/dashboard/shared/VerifiedBadge";

describe("VerifiedBadge", () => {
  test("renders the verified label and aria-label by default without text", () => {
    render(<VerifiedBadge />);
    const badge = screen.getByLabelText("Verified artist");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("title", "Verified artist");
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  test("shows the text label when label prop is true", () => {
    render(<VerifiedBadge label />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  test("applies a custom className", () => {
    render(<VerifiedBadge className="custom-class" />);
    expect(screen.getByLabelText("Verified artist")).toHaveClass("custom-class");
  });

  test("sizes the icon from the size prop", () => {
    const { container } = render(<VerifiedBadge size={32} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveStyle({ width: "32px", height: "32px" });
  });
});
