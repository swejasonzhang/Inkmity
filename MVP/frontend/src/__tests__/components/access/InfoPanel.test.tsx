import { jest, describe, test, expect } from "@jest/globals";
import { render, screen, waitFor } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("@/components/access/InkMascot", () => ({
  default: jest.fn(({ dx, dy, hasError, isPasswordHidden }: any) => (
    <div
      data-testid="ink-mascot"
      data-dx={dx ?? 0}
      data-dy={dy ?? 0}
      data-has-error={hasError}
      data-password-hidden={isPasswordHidden}
    />
  )),
}));

const { default: InfoPanel } = await import("@/components/access/InfoPanel");

describe("InfoPanel", () => {
  test("should render info panel", async () => {
    const { container } = render(<InfoPanel show={true} prefersReduced={false} />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  test("should display mission message for signup", async () => {
    render(<InfoPanel show={true} prefersReduced={false} mode="signup" />);
    await waitFor(() => {
      expect(screen.getByText(/Our Mission/i)).toBeInTheDocument();
    });
  });

  test("should display welcome message for login", async () => {
    render(<InfoPanel show={true} prefersReduced={false} mode="login" />);
    await waitFor(() => {
      expect(screen.getByText(/We've missed you/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("should render InkMascot", async () => {
    render(<InfoPanel show={true} prefersReduced={false} />);
    await waitFor(() => {
      expect(screen.getByTestId("ink-mascot")).toBeInTheDocument();
    });
  });
});
