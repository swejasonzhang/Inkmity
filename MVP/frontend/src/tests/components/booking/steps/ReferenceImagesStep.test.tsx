import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("@/lib/cloudinary", () => ({
  uploadToCloudinary: jest.fn<() => Promise<{ public_id: string }>>().mockResolvedValue({ public_id: "test-id" }),
  getSignedUpload: jest.fn<() => Promise<any>>().mockResolvedValue({}),
}));

const { default: ReferenceImagesStep } = await import("@/components/booking/steps/ReferenceImagesStep");

describe("ReferenceImagesStep", () => {
  const defaultProps = {
    value: [] as string[],
    onChange: jest.fn<(imageIds: string[]) => void>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render reference images step", () => {
    render(<ReferenceImagesStep {...defaultProps} />);
    const refTexts = screen.getAllByText(/Reference Images/i);
    expect(refTexts.length).toBeGreaterThan(0);
  });

  test("should render upload area", () => {
    render(<ReferenceImagesStep {...defaultProps} />);
    expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
  });

  test("should disable upload when max images reached", () => {
    render(<ReferenceImagesStep {...defaultProps} value={["id1", "id2", "id3", "id4", "id5"]} />);
    const input = screen.getByLabelText(/Click to upload/i).closest("label")?.querySelector("input");
    expect(input).toBeDisabled();
  });
});
