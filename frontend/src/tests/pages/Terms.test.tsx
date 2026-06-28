import { jest, describe, test, expect } from "@jest/globals";
import { render, screen, act } from "@/tests/setup/test-utils";

const usePageMeta = jest.fn();

jest.unstable_mockModule("@/hooks/usePageMeta", () => ({ usePageMeta }));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/VideoBackground", () => ({
  default: () => <div data-testid="video-bg" />,
}));

const { default: Terms } = await import("@/pages/Terms");

describe("Terms page", () => {
  test("renders the terms title, last-updated, and section headings", async () => {
    await act(async () => {
      render(<Terms />);
    });

    expect(
      screen.getByRole("heading", { name: "Terms of Service", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Eligibility" })
    ).toBeInTheDocument();
    expect(usePageMeta).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Terms of Service" })
    );
  });
});
