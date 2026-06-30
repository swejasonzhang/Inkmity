import { jest, describe, test, expect } from "@jest/globals";
import { createRef } from "react";
import { render, screen } from "@/tests/setup/test-utils";
import type { HScrollHandle } from "@/components/ui/HScroll";

const { default: HScroll } = await import("@/components/ui/HScroll");

describe("HScroll", () => {
  test("renders its children", () => {
    render(
      <HScroll>
        <div>Child A</div>
        <div>Child B</div>
      </HScroll>
    );
    expect(screen.getByText("Child A")).toBeInTheDocument();
    expect(screen.getByText("Child B")).toBeInTheDocument();
  });

  test("merges custom className onto the scroll container", () => {
    const { container } = render(
      <HScroll className="custom-scroll">
        <span>x</span>
      </HScroll>
    );
    expect(container.firstChild).toHaveClass("custom-scroll");
    expect(container.firstChild).toHaveClass("overflow-x-auto");
  });

  test("scrollByDir scrolls right by 85% of client width", () => {
    const ref = createRef<HScrollHandle>();
    const { container } = render(
      <HScroll ref={ref}>
        <span>x</span>
      </HScroll>
    );
    const node = container.firstChild as HTMLDivElement;
    Object.defineProperty(node, "clientWidth", { value: 200, configurable: true });
    const scrollBy = jest.fn();
    node.scrollBy = scrollBy as unknown as typeof node.scrollBy;

    ref.current?.scrollByDir(1);
    expect(scrollBy).toHaveBeenCalledWith({ left: 170, behavior: "smooth" });
  });

  test("scrollByDir scrolls left for negative direction", () => {
    const ref = createRef<HScrollHandle>();
    const { container } = render(
      <HScroll ref={ref}>
        <span>x</span>
      </HScroll>
    );
    const node = container.firstChild as HTMLDivElement;
    Object.defineProperty(node, "clientWidth", { value: 100, configurable: true });
    const scrollBy = jest.fn();
    node.scrollBy = scrollBy as unknown as typeof node.scrollBy;

    ref.current?.scrollByDir(-1);
    expect(scrollBy).toHaveBeenCalledWith({ left: -85, behavior: "smooth" });
  });
});
