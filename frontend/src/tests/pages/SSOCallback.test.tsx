import { jest, describe, test, expect } from "@jest/globals";
import { render, screen, act } from "@/tests/setup/test-utils";

const AuthenticateWithRedirectCallback = jest.fn(() => (
  <div data-testid="clerk-callback" />
));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  AuthenticateWithRedirectCallback,
}));
jest.unstable_mockModule("@/components/ui/spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));
jest.unstable_mockModule("@/components/VideoBackground", () => ({
  default: () => <div data-testid="video-bg" />,
}));

const { default: SSOCallback } = await import("@/pages/SSOCallback");

describe("SSOCallback page", () => {
  test("renders spinner, status text, and triggers the Clerk redirect callback", async () => {
    await act(async () => {
      render(<SSOCallback />);
    });

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.getByText(/completing sign in/i)).toBeInTheDocument();
    expect(screen.getByTestId("clerk-callback")).toBeInTheDocument();
    expect(AuthenticateWithRedirectCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        signInForceRedirectUrl: "/onboarding",
        signUpForceRedirectUrl: "/onboarding",
      }),
      undefined
    );
  });
});
