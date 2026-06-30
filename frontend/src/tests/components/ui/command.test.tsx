import { describe, test, expect, beforeAll } from "@jest/globals";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/tests/setup/test-utils";

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

const {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} = await import("@/components/ui/command");

function Harness() {
  return (
    <Command>
      <CommandInput placeholder="Type a command" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem value="apple">
            Apple
            <CommandShortcut>⌘A</CommandShortcut>
          </CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandGroup>
        <CommandSeparator />
      </CommandList>
    </Command>
  );
}

describe("Command", () => {
  test("renders the input and items", () => {
    render(<Harness />);
    expect(screen.getByPlaceholderText("Type a command")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
  });

  test("renders the group heading and shortcut", () => {
    render(<Harness />);
    expect(screen.getByText("Suggestions")).toBeInTheDocument();
    expect(screen.getByText("⌘A")).toBeInTheDocument();
  });

  test("filters items as the user types", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByPlaceholderText("Type a command"), "ban");
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
  });

  test("shows the empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByPlaceholderText("Type a command"), "zzzzz");
    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });

  test("exposes data-slot markers", () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('[data-slot="command"]')).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="command-input"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="command-list"]')
    ).toBeInTheDocument();
  });
});
