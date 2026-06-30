import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

const mockUseOnboarded = jest.fn<() => any>();
jest.unstable_mockModule("@/hooks/useOnboarded", () => ({
  useOnboarded: () => mockUseOnboarded(),
}));

const { default: Hero } = await import("@/components/landing/Hero");
const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

describe("Hero (landing)", () => {
  beforeEach(() => {
    mockUseOnboarded.mockReturnValue({ onboarded: false });
  });

  test("shows the value proposition a visitor reads", () => {
    render(<Hero textFadeUp={fade} prefersReduced={false} onReveal={jest.fn()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/book, and earn/i);
    expect(
      screen.getByText(/Find tattoo artists across the US by style and availability/i)
    ).toBeInTheDocument();
  });

  test("a signed-out visitor's primary CTA goes to signup; 'Sign in' goes to login", () => {
    render(<Hero textFadeUp={fade} prefersReduced={false} onReveal={jest.fn()} />);
    expect(
      screen.getByRole("link", { name: /create your inkmity account/i })
    ).toHaveAttribute("href", "/signup");
    expect(
      screen.getByRole("link", { name: /sign in to your account/i })
    ).toHaveAttribute("href", "/login");
  });

  test("an already-onboarded visitor's primary CTA goes to login instead", () => {
    mockUseOnboarded.mockReturnValue({ onboarded: true });
    render(<Hero textFadeUp={fade} prefersReduced={false} onReveal={jest.fn()} />);
    expect(
      screen.getByRole("link", { name: /go to your dashboard/i })
    ).toHaveAttribute("href", "/login");
  });

  test("clicking 'Scroll to explore' reveals the rest of the page", () => {
    const onReveal = jest.fn();
    render(<Hero textFadeUp={fade} prefersReduced={false} onReveal={onReveal} />);
    screen.getByRole("button", { name: /scroll to learn more/i }).click();
    expect(onReveal).toHaveBeenCalledTimes(1);
  });
});
