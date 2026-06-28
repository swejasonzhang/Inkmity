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

const { default: About } = await import("@/pages/About");

describe("About page", () => {
  test("renders story heading, principles, and meta", async () => {
    await act(async () => {
      render(<About />);
    });

    expect(screen.getByText("Inkmity's Story")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Principles" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Where we're going" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(usePageMeta).toHaveBeenCalledWith(
      expect.objectContaining({ title: "About" })
    );
  });
});
