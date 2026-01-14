import { describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const { default: Differentiators } = await import("@/components/landing/Differentiators");

describe("Differentiators", () => {
  test("should render differentiators section", () => {
    const mockTextFadeUp = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 },
    };
    const { container } = render(<Differentiators textFadeUp={mockTextFadeUp} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
