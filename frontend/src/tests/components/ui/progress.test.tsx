import { describe, test, expect } from "@jest/globals";
import { render } from "@/tests/setup/test-utils";

const { Progress } = await import("@/components/ui/progress");

describe("Progress", () => {
  test("renders the root and indicator slots", () => {
    const { container } = render(<Progress value={40} />);
    expect(container.querySelector('[data-slot="progress"]')).toBeInTheDocument();
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toBeInTheDocument();
  });

  test("translates the indicator based on value", () => {
    const { container } = render(<Progress value={40} />);
    const indicator = container.querySelector(
      '[data-slot="progress-indicator"]'
    ) as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-60%)");
  });

  test("falls back to 0 when value is missing", () => {
    const { container } = render(<Progress />);
    const indicator = container.querySelector(
      '[data-slot="progress-indicator"]'
    ) as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-100%)");
  });

  test("merges custom className onto the root", () => {
    const { container } = render(<Progress value={10} className="my-bar" />);
    expect(container.querySelector('[data-slot="progress"]')).toHaveClass("my-bar");
  });
});
