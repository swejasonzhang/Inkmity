import { jest, describe, test, expect } from "@jest/globals";
import React from "react";
import { render, screen, act } from "@/tests/setup/test-utils";

const usePageMeta = jest.fn();

jest.unstable_mockModule("@/hooks/usePageMeta", () => ({ usePageMeta }));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/VideoBackground", () => ({
  default: () => <div data-testid="video-bg" />,
}));
const MOTION_ONLY_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "whileHover",
  "whileTap",
  "whileInView",
  "whileFocus",
  "viewport",
]);

const stripMotionProps = (props: any) => {
  const clean: Record<string, any> = {};
  for (const key of Object.keys(props)) {
    if (!MOTION_ONLY_PROPS.has(key)) clean[key] = props[key];
  }
  return React.createElement("div", clean, props.children);
};

jest.unstable_mockModule("framer-motion", () => ({
  motion: new Proxy({}, { get: () => stripMotionProps }),
}));

const { default: FAQ } = await import("@/pages/FAQ");

describe("FAQ page", () => {
  test("renders heading and section titles", async () => {
    await act(async () => {
      render(<FAQ />);
    });

    expect(
      screen.getByRole("heading", { name: /frequently asked questions/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Booking & sessions")).toBeInTheDocument();
    expect(screen.getByText("Payments, fees & deposits")).toBeInTheDocument();
    expect(screen.getByText("Trust & safety")).toBeInTheDocument();
  });

  test("renders question/answer accordions with answer text present", async () => {
    await act(async () => {
      render(<FAQ />);
    });

    expect(
      screen.getByText("How does booking work on Inkmity?")
    ).toBeInTheDocument();
    expect(screen.getByText(/100%\. Tips are optional/i)).toBeInTheDocument();
  });

  test("contact CTA links to /contact", async () => {
    await act(async () => {
      render(<FAQ />);
    });

    const link = screen.getByRole("link", { name: /contact us/i });
    expect(link).toHaveAttribute("href", "/contact");
  });
});
