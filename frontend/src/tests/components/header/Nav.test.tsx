import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";
import { Nav } from "@/components/header/Nav";

describe("Nav", () => {
  test("renders enabled items as links to their routes and marks the active one", () => {
    const items: any = [
      { label: "Explore", to: "/artists" },
      { label: "Messages", to: "/messages", count: 3 },
    ];
    render(<Nav items={items} isActive={(to) => to === "/artists"} isSignedIn />);

    const explore = screen.getAllByRole("link", { name: /explore/i })[0];
    expect(explore).toHaveAttribute("href", "/artists");
    expect(explore).toHaveAttribute("aria-current", "page");

    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  });

  test("a sign-in-required item is a button that prompts to sign in when clicked", () => {
    const onClick = jest.fn();
    const items: any = [{ label: "Dashboard", to: "#", disabled: true, onClick }];
    render(<Nav items={items} isActive={() => false} isSignedIn={false} />);

    const btn = screen.getAllByRole("button", { name: /dashboard.*sign in required/i })[0];
    btn.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
  });
});
