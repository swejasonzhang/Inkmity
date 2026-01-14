import { jest, describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: BottomCTA } = await import("@/components/landing/BottomCTA");

describe("BottomCTA", () => {
  test("should render bottom CTA", () => {
    const mockTextFadeUp = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 },
    };
    const { container } = render(<BottomCTA textFadeUp={mockTextFadeUp} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
