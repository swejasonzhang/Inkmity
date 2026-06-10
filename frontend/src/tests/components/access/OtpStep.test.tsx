import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockPrepareEmailVerification = jest.fn<() => Promise<void>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      prepareEmailAddressVerification: mockPrepareEmailVerification,
    },
  }),
}));

const { default: OtpStep } = await import("@/components/access/OtpStep");

describe("OtpStep", () => {
  const defaultProps = {
    code: "",
    setCode: jest.fn<(v: string) => void>(),
    onVerify: jest.fn<() => void>(),
    onBack: jest.fn<() => void>(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepareEmailVerification.mockResolvedValue(undefined);
  });

  test("should render six code inputs", () => {
    render(<OtpStep {...defaultProps} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  test("should display expiry timer", () => {
    render(<OtpStep {...defaultProps} />);
    expect(screen.getByText(/Expires in/i)).toBeInTheDocument();
  });

  test("should call setCode when a digit is entered", async () => {
    const user = userEvent.setup();
    const setCode = jest.fn();
    render(<OtpStep {...defaultProps} setCode={setCode} />);

    await user.type(screen.getByLabelText("Digit 1"), "1");
    expect(setCode).toHaveBeenCalled();
  });

  test("should call onVerify when verify button is clicked", async () => {
    const user = userEvent.setup();
    const onVerify = jest.fn();
    render(<OtpStep {...defaultProps} code="123456" onVerify={onVerify} />);

    await user.click(screen.getByText(/Verify & Continue/i));
    expect(onVerify).toHaveBeenCalled();
  });
});
