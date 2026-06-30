import { describe, test, expect } from "@jest/globals";
import { render } from "@/tests/setup/test-utils";

const { default: Divider } = await import("@/components/landing/Divider");

// Divider is purely presentational; its only behavior is honoring a passed
// className, so that is all that is worth asserting (no coverage-theater).
describe("Divider (landing)", () => {
  test("applies the className it is given", () => {
    const { container } = render(<Divider className="my-custom-divider" />);
    expect(container.querySelector(".my-custom-divider")).toBeInTheDocument();
  });
});
