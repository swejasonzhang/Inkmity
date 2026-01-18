import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const mockSignIn = jest.fn();
const mockSetActive = jest.fn();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useClerk: () => ({
    signIn: mockSignIn,
    setActive: mockSetActive,
  }),
  useUser: () => ({
    user: null,
    isSignedIn: false,
    isLoaded: true,
  }),
  useAuth: () => ({
    isSignedIn: false,
    isLoaded: true,
  }),
}));

const { default: LoginFormCard } = await import("@/components/access/LoginFormCard");

describe("LoginFormCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render login form", () => {
    const { container } = render(<LoginFormCard showInfo={false} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
