import { jest, describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const { default: ImageGrid } = await import("@/components/dashboard/client/ImageGrid");

describe("ImageGrid", () => {
  test("should render image grid", () => {
    const { container } = render(
      <ImageGrid images={["image1.jpg", "image2.jpg"]} imgAltPrefix="Portfolio" onOpenZoom={jest.fn()} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
