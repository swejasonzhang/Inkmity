import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ userId: "user-1" }),
}));

jest.unstable_mockModule("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: () => (props: any) => {
        const { children, ...rest } = props;
        const clean: any = {};
        for (const k of Object.keys(rest)) {
          if (!["initial", "animate", "exit", "transition", "whileHover", "whileTap"].includes(k)) {
            clean[k] = rest[k];
          }
        }
        return <div {...clean}>{children}</div>;
      },
    }
  ),
}));

const { default: CookieConsent } = await import("@/components/access/CookieConsent");

describe("CookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  test("shows the consent dialog after the delay when no choice is stored", async () => {
    render(<CookieConsent />);
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(screen.getByRole("dialog", { name: /cookie consent/i })).toBeInTheDocument();
    expect(screen.getByText("We use cookies")).toBeInTheDocument();
  });

  test("does not show when a choice is already stored", () => {
    localStorage.setItem("inkmity-cookie-consent:user-1", "accepted");
    render(<CookieConsent />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("persists the accepted choice and hides the dialog", async () => {
    jest.useRealTimers();
    const user = userEvent.setup();
    render(<CookieConsent />);
    await waitFor(() => expect(screen.getByText("We use cookies")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect(localStorage.getItem("inkmity-cookie-consent:user-1")).toBe("accepted");
    await waitFor(() => expect(screen.queryByText("We use cookies")).not.toBeInTheDocument());
  });

  test("persists the declined choice", async () => {
    jest.useRealTimers();
    const user = userEvent.setup();
    render(<CookieConsent />);
    await waitFor(() => expect(screen.getByText("We use cookies")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(localStorage.getItem("inkmity-cookie-consent:user-1")).toBe("declined");
  });
});
