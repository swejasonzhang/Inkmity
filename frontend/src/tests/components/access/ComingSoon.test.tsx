import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

jest.unstable_mockModule("@/hooks/useTheme", () => ({
  useTheme: () => ({ themeClass: "theme-dark" }),
}));

jest.unstable_mockModule("@/components/VideoBackground", () => ({
  default: () => <div data-testid="video-bg" />,
}));

const { default: ComingSoon } = await import("@/components/access/ComingSoon");

describe("ComingSoon", () => {
  test("renders the headline and testing badge", () => {
    render(<ComingSoon />);
    expect(screen.getByText("Inkmity is almost here.")).toBeInTheDocument();
    expect(screen.getByText(/Currently in testing/i)).toBeInTheDocument();
  });

  test("renders the video background", () => {
    render(<ComingSoon />);
    expect(screen.getByTestId("video-bg")).toBeInTheDocument();
  });

  test("applies the theme class from useTheme", () => {
    const { container } = render(<ComingSoon />);
    expect(container.querySelector(".theme-dark")).toBeInTheDocument();
  });
});
