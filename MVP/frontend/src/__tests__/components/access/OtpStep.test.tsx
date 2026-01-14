import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
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

jest.unstable_mockModule("@/components/dashboard/shared/FormInput", () => ({
  default: ({ value, onChange, placeholder, message }: any) => (
    <div>
      <input
        data-testid="otp-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <p>{message}</p>
    </div>
  ),
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

  test("should render OTP step", () => {
    render(<OtpStep {...defaultProps} />);
    expect(screen.getByTestId("otp-input")).toBeInTheDocument();
  });

  test("should display expiry timer", () => {
    render(<OtpStep {...defaultProps} />);
    expect(screen.getByText(/Expires in/i)).toBeInTheDocument();
  });

  test("should call setCode when input changes", async () => {
    const user = userEvent.setup();
    const setCode = jest.fn();
    render(<OtpStep {...defaultProps} setCode={setCode} />);
    
    const input = screen.getByTestId("otp-input");
    await user.type(input, "123456");
    expect(setCode).toHaveBeenCalled();
  });

  test("should call onVerify when verify button is clicked", async () => {
    const user = userEvent.setup();
    const onVerify = jest.fn();
    render(<OtpStep {...defaultProps} code="123456" onVerify={onVerify} />);
    
    const verifyButton = screen.getByText(/Verify & Continue/i);
    await user.click(verifyButton);
    expect(onVerify).toHaveBeenCalled();
  });
});
