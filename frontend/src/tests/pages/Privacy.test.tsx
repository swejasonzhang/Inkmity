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

const { default: Privacy } = await import("@/pages/Privacy");

describe("Privacy page", () => {
  test("renders the privacy title, last-updated, and policy content", async () => {
    await act(async () => {
      render(<Privacy />);
    });

    expect(
      screen.getByRole("heading", { name: "Privacy Policy", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    expect(usePageMeta).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Privacy Policy" })
    );
  });
});
