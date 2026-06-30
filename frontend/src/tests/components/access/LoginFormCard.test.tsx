import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

let authState: any = { isSignedIn: false, isLoaded: true };
jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => authState,
}));

const { default: LoginFormCard } = await import("@/components/access/LoginFormCard");

describe("LoginFormCard", () => {
  beforeEach(() => {
    authState = { isSignedIn: false, isLoaded: true };
  });

  test("a logged-out visitor sees the welcome header, the form, and a signup prompt", () => {
    render(
      <LoginFormCard showInfo>
        <input aria-label="email" />
      </LoginFormCard>
    );
    expect(screen.getByRole("heading", { name: /welcome back!/i })).toBeInTheDocument();
    expect(screen.getByText(/Log in to pick up where you left off/i)).toBeInTheDocument();
    expect(screen.getByLabelText("email")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", "/signup");
  });

  test("honors the title and subtitle overrides", () => {
    render(<LoginFormCard showInfo titleOverride="Sign in to book" subtitleOverride="Almost there" />);
    expect(screen.getByRole("heading", { name: "Sign in to book" })).toBeInTheDocument();
    expect(screen.getByText("Almost there")).toBeInTheDocument();
  });

  test("hideHeader drops the header and signup prompt but keeps the form", () => {
    render(
      <LoginFormCard showInfo hideHeader>
        <input aria-label="email" />
      </LoginFormCard>
    );
    expect(screen.queryByRole("heading", { name: /welcome back/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign up/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("email")).toBeInTheDocument();
  });

  test("once signed in, the login header is hidden but provided content still renders", () => {
    authState = { isSignedIn: true, isLoaded: true };
    render(
      <LoginFormCard showInfo>
        <div>You are already signed in</div>
      </LoginFormCard>
    );
    expect(screen.queryByRole("heading", { name: /welcome back/i })).not.toBeInTheDocument();
    expect(screen.getByText("You are already signed in")).toBeInTheDocument();
  });
});
