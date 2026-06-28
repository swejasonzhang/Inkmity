import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@/tests/setup/test-utils";

const usePageMeta = jest.fn();
const toastError = jest.fn();

jest.unstable_mockModule("@/hooks/usePageMeta", () => ({ usePageMeta }));
jest.unstable_mockModule("react-toastify", () => ({
  toast: { error: toastError, success: jest.fn() },
}));
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

const { default: Contact } = await import("@/pages/Contact");

const submit = () => {
  const button = screen.getByRole("button", { name: /send message/i });
  fireEvent.click(button);
};

describe("Contact page", () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  test("renders the contact form and heading", async () => {
    await act(async () => {
      render(<Contact />);
    });

    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /jason@inkmity\.com/i })
    ).toHaveAttribute("href", "mailto:jason@inkmity.com");
    expect(usePageMeta).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Contact" })
    );
  });

  test("blocks submissions that arrive too fast (anti-spam)", async () => {
    await act(async () => {
      render(<Contact />);
    });

    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Slow down and try again.")
    );
  });

  test("validates required fields once the anti-spam delay passes", async () => {
    const nowSpy = jest.spyOn(Date, "now");
    const base = 1_000_000;
    nowSpy.mockReturnValue(base);

    await act(async () => {
      render(<Contact />);
    });

    nowSpy.mockReturnValue(base + 5000);

    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Please complete name, email, and message."
      )
    );

    nowSpy.mockRestore();
  });
});
