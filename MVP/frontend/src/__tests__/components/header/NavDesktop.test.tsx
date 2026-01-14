import { jest, describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/dashboard" }),
  useNavigate: () => jest.fn(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { NavDesktop } = await import("@/components/header/NavDesktop");

describe("NavDesktop", () => {
  test("should render desktop navigation", () => {
    const { container } = render(<NavDesktop items={[]} isActive={() => false} isSignedIn={false} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
