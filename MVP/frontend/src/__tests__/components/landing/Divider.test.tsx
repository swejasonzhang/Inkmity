import { describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const { default: Divider } = await import("@/components/landing/Divider");

describe("Divider", () => {
  test("should render divider", () => {
    const { container } = render(<Divider />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
