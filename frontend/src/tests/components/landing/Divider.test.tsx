import { describe, test, expect } from "@jest/globals";
import { render } from "@/tests/setup/test-utils";

const { default: Divider } = await import("@/components/landing/Divider");

describe("Divider (landing)", () => {
  test("applies the className it is given", () => {
    const { container } = render(<Divider className="my-custom-divider" />);
    expect(container.querySelector(".my-custom-divider")).toBeInTheDocument();
  });
});
