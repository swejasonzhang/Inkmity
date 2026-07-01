import { jest, describe, test, expect } from "@jest/globals";
import { act } from "@testing-library/react";
import { render, screen } from "@/tests/setup/test-utils";
import FullscreenZoom from "@/components/dashboard/client/FullscreenZoom";

describe("FullscreenZoom", () => {
  test("shows the zoomed artwork", () => {
    render(<FullscreenZoom src="art.jpg" count="2 / 5" onPrev={jest.fn()} onNext={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByAltText("Zoomed artwork")).toHaveAttribute("src", "art.jpg");
  });

  test("closes on Escape and via the close button", () => {
    const onClose = jest.fn();
    render(<FullscreenZoom src="art.jpg" count="2 / 5" onPrev={jest.fn()} onNext={jest.fn()} onClose={onClose} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    screen.getByRole("button", { name: "Close image" }).click();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test("navigates with the prev/next controls", () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    render(<FullscreenZoom src="art.jpg" count="2 / 5" onPrev={onPrev} onNext={onNext} onClose={jest.fn()} />);

    screen.getByRole("button", { name: "Previous image" }).click();
    expect(onPrev).toHaveBeenCalledTimes(1);
    screen.getByRole("button", { name: "Next image" }).click();
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
