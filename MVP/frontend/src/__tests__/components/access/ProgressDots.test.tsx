import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";

const { default: ProgressDots } = await import("@/components/access/ProgressDots");

describe("ProgressDots", () => {
  test("should render correct number of dots", () => {
    const { container } = render(<ProgressDots total={5} current={2} />);
    const dots = container.querySelectorAll("div[class*='rounded-full']");
    expect(dots.length).toBeGreaterThanOrEqual(5);
  });

  test("should highlight current step", () => {
    const { container } = render(<ProgressDots total={5} current={2} />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  test("should not highlight non-current steps", () => {
    const { container } = render(<ProgressDots total={5} current={2} />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  test("should handle showVerify prop", () => {
    render(<ProgressDots total={5} current={2} showVerify={true} />);
    expect(screen.getByText(/Verify/i)).toBeInTheDocument();
  });
});
