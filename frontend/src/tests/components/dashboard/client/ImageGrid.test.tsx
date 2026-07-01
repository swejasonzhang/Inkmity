import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";
import ImageGrid from "@/components/dashboard/client/ImageGrid";

describe("ImageGrid", () => {
  test("renders each image with a numbered alt label", () => {
    render(
      <ImageGrid images={["a.jpg", "b.jpg", "c.jpg"]} imgAltPrefix="Portfolio" onOpenZoom={jest.fn()} />
    );
    expect(screen.getByAltText("Portfolio 1")).toHaveAttribute("src", "a.jpg");
    expect(screen.getByAltText("Portfolio 2")).toHaveAttribute("src", "b.jpg");
    expect(screen.getByAltText("Portfolio 3")).toBeInTheDocument();
  });

  test("clicking an image opens the zoom at its absolute index (offset applied)", () => {
    const onOpenZoom = jest.fn();
    render(
      <ImageGrid images={["a.jpg", "b.jpg"]} imgAltPrefix="Portfolio" startOffset={10} onOpenZoom={onOpenZoom} />
    );
    screen.getByRole("button", { name: "Open Portfolio 2" }).click();
    expect(onOpenZoom).toHaveBeenCalledWith(11);
  });
});
