import { jest, describe, test, expect } from "@jest/globals";
import { render, screen, act } from "@/tests/setup/test-utils";

const usePageMeta = jest.fn();

jest.unstable_mockModule("@/hooks/usePageMeta", () => ({ usePageMeta }));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));

const { default: NotFound } = await import("@/pages/NotFound");

describe("NotFound page", () => {
  test("shows 404 message and a home link", async () => {
    await act(async () => {
      render(<NotFound />);
    });

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText(/couldn't find that page/i)).toBeInTheDocument();

    const home = screen.getByRole("link", { name: /back to home/i });
    expect(home).toHaveAttribute("href", "/");
    expect(usePageMeta).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Page not found" })
    );
  });
});
