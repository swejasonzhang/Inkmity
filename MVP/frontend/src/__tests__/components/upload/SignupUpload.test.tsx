import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, waitFor } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockGetToken = jest.fn<() => Promise<string>>();
const mockGetSignedUpload = jest.fn<() => Promise<any>>();
const mockUploadToCloudinary = jest.fn<() => Promise<any>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}));

jest.unstable_mockModule("@/lib/cloudinary", () => ({
  getSignedUpload: mockGetSignedUpload,
  uploadToCloudinary: mockUploadToCloudinary,
}));

const { default: SignupUpload } = await import("@/components/upload/SignupUpload");

describe("SignupUpload", () => {
  const defaultProps = {
    label: "Upload Images",
    kind: "client_ref" as const,
    value: [] as string[],
    onChange: jest.fn<(urls: string[]) => void>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockGetSignedUpload.mockResolvedValue({ signature: "mock-sig", timestamp: 123 });
    mockUploadToCloudinary.mockResolvedValue({ public_id: "mock-id", secure_url: "https://example.com/image.jpg" });
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = jest.fn();
  });

  test("should render upload component", () => {
    const { container } = render(<SignupUpload {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should display file input", () => {
    const { container } = render(<SignupUpload {...defaultProps} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
  });

  test("should call onChange when files are uploaded", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    mockGetSignedUpload.mockResolvedValue({ signature: "mock-sig", timestamp: 123 });
    mockUploadToCloudinary.mockResolvedValue({ 
      public_id: "mock-id", 
      secure_url: "https://example.com/image.jpg",
      url: "https://example.com/image.jpg"
    });
    
    const { container } = render(<SignupUpload {...defaultProps} onChange={onChange} />);
    
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      }, { timeout: 5000 });
    }
  });

  test("should display existing images", () => {
    const { container } = render(<SignupUpload {...defaultProps} value={["https://example.com/image1.jpg"]} />);
    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
  });
});
