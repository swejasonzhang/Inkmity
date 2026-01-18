import { jest, describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/dashboard" }),
  useNavigate: () => jest.fn(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { NavMobile } = await import("@/components/header/NavMobile");

describe("NavMobile", () => {
  test("should render mobile navigation", () => {
    const { container } = render(<NavMobile items={[]} isActive={() => false} isSignedIn={false} setMobileMenuOpen={jest.fn()} handleLogout={jest.fn()} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
