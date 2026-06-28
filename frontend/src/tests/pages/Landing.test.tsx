import { jest, describe, test, expect } from "@jest/globals";
import React from "react";
import { render, screen, act } from "@/tests/setup/test-utils";

const Passthrough = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

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
  LazyMotion: Passthrough,
  MotionConfig: Passthrough,
  domAnimation: {},
  useReducedMotion: () => false,
  m: new Proxy({}, { get: () => stripMotionProps }),
}));

const stub = (testid: string) => ({ default: () => <div data-testid={testid} /> });
jest.unstable_mockModule("@/components/header/Header", () => stub("header"));
jest.unstable_mockModule("@/components/landing/Hero", () => stub("hero"));
jest.unstable_mockModule("@/components/landing/HowItWorks", () => stub("how"));
jest.unstable_mockModule("@/components/landing/FeaturesGrid", () => stub("features"));
jest.unstable_mockModule("@/components/landing/Differentiators", () => stub("diff"));
jest.unstable_mockModule("@/components/landing/Pricing", () => stub("pricing"));
jest.unstable_mockModule("@/components/landing/Roadmap", () => stub("roadmap"));
jest.unstable_mockModule("@/components/landing/ForArtists", () => stub("forartists"));
jest.unstable_mockModule("@/components/landing/BottomCTA", () => stub("cta"));
jest.unstable_mockModule("@/components/landing/Divider", () => stub("divider"));
jest.unstable_mockModule("@/components/VideoBackground", () => stub("video-bg"));
jest.unstable_mockModule("@/components/access/CookieConsent", () => stub("cookie"));

const { default: Landing } = await import("@/pages/Landing");

describe("Landing page", () => {
  test("renders header, hero, key sections, and footer", async () => {
    await act(async () => {
      render(<Landing />);
    });

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("hero")).toBeInTheDocument();
    expect(screen.getByTestId("how")).toBeInTheDocument();
    expect(screen.getByTestId("pricing")).toBeInTheDocument();
    expect(screen.getByTestId("cta")).toBeInTheDocument();
    expect(screen.getByTestId("cookie")).toBeInTheDocument();
    expect(
      screen.getByText(/All rights reserved\./i)
    ).toBeInTheDocument();
  });
});
