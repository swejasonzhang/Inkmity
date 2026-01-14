import { describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const { InkBar, InkAccentMobile } = await import("@/components/header/InkBar");

describe("InkBar", () => {
  test("should render ink bar", () => {
    const { container } = render(<InkBar active={true} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should render with active state", () => {
    const { container } = render(<InkBar active={true} />);
    const span = container.querySelector("span[aria-hidden]");
    expect(span?.className).toContain("scale-x-100");
  });

  test("should render with inactive state", () => {
    const { container } = render(<InkBar active={false} />);
    const span = container.querySelector("span[aria-hidden]");
    expect(span?.className).toContain("scale-x-0");
  });
});

describe("InkAccentMobile", () => {
  test("should render ink accent mobile", () => {
    const { container } = render(<InkAccentMobile active={true} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should render with active state", () => {
    const { container } = render(<InkAccentMobile active={true} />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("opacity-100");
  });
});
