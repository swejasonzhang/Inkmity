import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, waitFor, act } from "@testing-library/react";

const mockNavigate = jest.fn();
let mockLocation: any = { key: "1", pathname: "/explore", state: null };

jest.unstable_mockModule("react-router-dom", () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}));

const { default: GateNotice } = await import("@/components/access/GateNotice");

describe("GateNotice", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    (window as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("renders nothing when there is no gate state", () => {
    mockLocation = { key: "a", pathname: "/explore", state: null };
    const { container } = render(<GateNotice />);
    expect(container.firstChild).toBeNull();
  });

  test("shows the sign-in notice when navigated with a gate flag", async () => {
    mockLocation = { key: "b", pathname: "/explore", state: { gate: true } };
    render(<GateNotice />);
    await waitFor(() =>
      expect(screen.getByText("Sign in to access this page")).toBeInTheDocument()
    );
    expect(mockNavigate).toHaveBeenCalledWith("/explore", { replace: true, state: {} });
  });

  test("auto-dismisses the notice after the timeout", async () => {
    jest.useFakeTimers();
    mockLocation = { key: "c", pathname: "/explore", state: { gate: true } };
    render(<GateNotice />);
    expect(screen.getByText("Sign in to access this page")).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(2400);
    });
    expect(screen.queryByText("Sign in to access this page")).not.toBeInTheDocument();
  });
});
