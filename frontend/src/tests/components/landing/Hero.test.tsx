import { jest, describe, test, expect } from "@jest/globals";
import { render, act } from "@/tests/setup/test-utils";

jest.unstable_mockModule("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: Hero } = await import("@/components/landing/Hero");

describe("Hero", () => {
  test("should render hero section", async () => {
    const mockTextFadeUp = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 },
    };
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<Hero textFadeUp={mockTextFadeUp} prefersReduced={false} onReveal={jest.fn()} />));
    });
    expect(container.firstChild).toBeInTheDocument();
  });
});
