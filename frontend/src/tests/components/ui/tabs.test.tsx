import { describe, test, expect } from "@jest/globals";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/tests/setup/test-utils";

const { Tabs, TabsList, TabsTrigger, TabsContent } = await import(
  "@/components/ui/tabs"
);

function Harness() {
  return (
    <Tabs defaultValue="one">
      <TabsList>
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two">Two</TabsTrigger>
      </TabsList>
      <TabsContent value="one">First panel</TabsContent>
      <TabsContent value="two">Second panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  test("renders triggers and the default panel", () => {
    render(<Harness />);
    expect(screen.getByRole("tab", { name: "One" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Two" })).toBeInTheDocument();
    expect(screen.getByText("First panel")).toBeInTheDocument();
  });

  test("marks the default tab active", () => {
    render(<Harness />);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "data-state",
      "active"
    );
  });

  test("switches panels when another tab is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByText("Second panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
      "data-state",
      "active"
    );
  });

  test("exposes data-slot markers", () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('[data-slot="tabs"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="tabs-list"]')).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="tabs-trigger"]')
    ).toBeInTheDocument();
  });
});
