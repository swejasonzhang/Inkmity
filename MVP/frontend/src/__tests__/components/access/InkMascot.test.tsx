import { describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const { default: InkMascot } = await import("@/components/access/InkMascot");

describe("InkMascot", () => {
  test("should render mascot", () => {
    const { container } = render(<InkMascot dx={0} dy={0} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  test("should render with error state", () => {
    const { container } = render(<InkMascot dx={0} dy={0} hasError={true} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  test("should render with password hidden state", () => {
    const { container } = render(<InkMascot dx={0} dy={0} isPasswordHidden={true} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
