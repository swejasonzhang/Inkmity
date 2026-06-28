import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockSignInRedirect = jest.fn<(args: any) => Promise<void>>();
const mockSignUpRedirect = jest.fn<(args: any) => Promise<void>>();
const mockToastError = jest.fn();

let signInLoaded = true;
let signUpLoaded = true;

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useSignIn: () => ({
    signIn: { authenticateWithRedirect: mockSignInRedirect },
    isLoaded: signInLoaded,
  }),
  useSignUp: () => ({
    signUp: { authenticateWithRedirect: mockSignUpRedirect },
    isLoaded: signUpLoaded,
  }),
  useClerk: () => ({}),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { error: mockToastError },
}));

const { default: OAuthButtons } = await import("@/components/access/OAuthButtons");

describe("OAuthButtons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signInLoaded = true;
    signUpLoaded = true;
  });

  test("renders a Google button", () => {
    render(<OAuthButtons mode="login" />);
    expect(screen.getByLabelText("Continue with Google")).toBeInTheDocument();
  });

  test("starts the sign-in redirect flow in login mode", async () => {
    mockSignInRedirect.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<OAuthButtons mode="login" />);
    await user.click(screen.getByLabelText("Continue with Google"));
    expect(mockSignInRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/onboarding",
      })
    );
  });

  test("starts the sign-up redirect flow in signup mode", async () => {
    mockSignUpRedirect.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<OAuthButtons mode="signup" />);
    await user.click(screen.getByLabelText("Continue with Google"));
    expect(mockSignUpRedirect).toHaveBeenCalled();
  });

  test("shows a toast when the redirect fails", async () => {
    mockSignInRedirect.mockRejectedValue({ errors: [{ message: "no good" }] });
    const user = userEvent.setup();
    render(<OAuthButtons mode="login" />);
    await user.click(screen.getByLabelText("Continue with Google"));
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("no good", expect.anything())
    );
  });

  test("disables the button when clerk is not loaded", () => {
    signInLoaded = false;
    render(<OAuthButtons mode="login" />);
    expect(screen.getByLabelText("Continue with Google")).toBeDisabled();
  });
});
