import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

jest.unstable_mockModule("@/lib/features", () => ({
  STUDIOS_ENABLED: false,
}));

const { default: RoleChooser } = await import("@/components/access/RoleChooser");

describe("RoleChooser", () => {
  test("renders the client and artist options", () => {
    render(<RoleChooser onSelect={jest.fn()} />);
    expect(screen.getByText("I want a tattoo")).toBeInTheDocument();
    expect(screen.getByText("I'm a tattoo artist")).toBeInTheDocument();
  });

  test("hides the studio option when studios are disabled", () => {
    render(<RoleChooser onSelect={jest.fn()} />);
    expect(screen.queryByText("I run a studio")).not.toBeInTheDocument();
  });

  test("calls onSelect with the chosen role", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<RoleChooser onSelect={onSelect} />);
    await user.click(screen.getByText("I want a tattoo"));
    expect(onSelect).toHaveBeenCalledWith("client");
    await user.click(screen.getByText("I'm a tattoo artist"));
    expect(onSelect).toHaveBeenCalledWith("artist");
  });
});
