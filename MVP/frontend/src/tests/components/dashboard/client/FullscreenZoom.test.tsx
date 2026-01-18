import { jest, describe, test, expect } from "@jest/globals";
import { render, waitFor, screen } from "@/__tests__/setup/test-utils";

const { default: FullscreenZoom } = await import("@/components/dashboard/client/FullscreenZoom");

describe("FullscreenZoom", () => {
  const defaultProps = {
    src: "image1.jpg",
    count: "1 / 3",
    onPrev: jest.fn(),
    onNext: jest.fn(),
    onClose: jest.fn(),
  };

  test("should render fullscreen zoom", async () => {
    const { container } = render(<FullscreenZoom {...defaultProps} />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  test("should display image count", async () => {
    render(<FullscreenZoom {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });
  });

  test("should call onClose when close button is clicked", async () => {
    const onClose = jest.fn();
    render(<FullscreenZoom {...defaultProps} onClose={onClose} />);
    await waitFor(() => {
      const closeButton = screen.getByLabelText("Close image");
      expect(closeButton).toBeInTheDocument();
    });
  });
});
