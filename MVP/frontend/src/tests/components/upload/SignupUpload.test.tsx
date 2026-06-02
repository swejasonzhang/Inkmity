import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockUploadUnsigned = jest.fn<() => Promise<{ url: string; publicId: string }>>();

jest.unstable_mockModule("@/lib/cloudinary", () => ({
  uploadUnsigned: mockUploadUnsigned,
  getSignedUpload: jest.fn(),
  uploadToCloudinary: jest.fn(),
}));

const { default: SignupUpload } = await import("@/components/upload/SignupUpload");

describe("SignupUpload", () => {
  const defaultProps = {
    label: "Upload Images",
    kind: "artist_portfolio" as const,
    value: [] as string[],
    onChange: jest.fn<(urls: string[]) => void>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadUnsigned.mockResolvedValue({ url: "https://example.com/image.jpg", publicId: "mock-id" });
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = jest.fn();
  });

  test("should render upload component", () => {
    const { container } = render(<SignupUpload {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should display file input", () => {
    const { container } = render(<SignupUpload {...defaultProps} />);
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  test("should call onChange when files are uploaded", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { container } = render(<SignupUpload {...defaultProps} onChange={onChange} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  test("should display existing images", () => {
    const { container } = render(<SignupUpload {...defaultProps} value={["https://example.com/image1.jpg"]} />);
    expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
  });
});
