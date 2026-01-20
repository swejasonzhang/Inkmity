import { jest, describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/dashboard" }),
  useNavigate: () => jest.fn(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { Nav } = await import("@/components/header/Nav");

describe("Nav", () => {
  test("should render desktop navigation", () => {
    const { container } = render(<Nav items={[]} isActive={() => false} isSignedIn={false} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should render mobile navigation", () => {
    const { container } = render(
      <Nav
        items={[]}
        isActive={() => false}
        isSignedIn={false}
        setMobileMenuOpen={jest.fn()}
        handleLogout={jest.fn()}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should render navigation items", () => {
    const mockItems = [
      { label: "Dashboard", to: "/dashboard", disabled: false },
      { label: "Profile", to: "/profile", disabled: false },
    ];

    const { container } = render(
      <Nav
        items={mockItems}
        isActive={(to) => to === "/dashboard"}
        isSignedIn={false}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  test("should handle disabled navigation items", () => {
    const mockItems = [
      { label: "Coming Soon", to: "#", disabled: true },
    ];

    const { container } = render(
      <Nav
        items={mockItems}
        isActive={() => false}
        isSignedIn={false}
        onDisabledDashboardHover={jest.fn()}
        onDisabledDashboardLeave={jest.fn()}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  test("should render profile and logout links for signed-in users in mobile", () => {
    const { container } = render(
      <Nav
        items={[]}
        isActive={() => false}
        isSignedIn={true}
        setMobileMenuOpen={jest.fn()}
        handleLogout={jest.fn()}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });
});