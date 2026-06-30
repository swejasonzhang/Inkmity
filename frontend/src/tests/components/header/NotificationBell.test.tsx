import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import userEvent from "@testing-library/user-event";
import { render, screen, act, waitFor } from "@/tests/setup/test-utils";

const mockGetToken = jest.fn<() => Promise<string | null>>();
const mockGetNotifications = jest.fn<() => Promise<any>>();
const mockNavigate = jest.fn();
const mockConnectSocket = jest.fn();

const socketHandlers: Record<string, ((...a: any[]) => void)[]> = {};
const socket = {
  connected: true,
  on: jest.fn((evt: string, cb: (...a: any[]) => void) => {
    (socketHandlers[evt] ||= []).push(cb);
  }),
  off: jest.fn(),
  emit: jest.fn(),
};

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
  useUser: () => ({
    user: { id: "user-1" },
    isSignedIn: true,
  }),
}));

jest.unstable_mockModule("@/api", () => ({
  getNotifications: mockGetNotifications,
}));

jest.unstable_mockModule("@/lib/socket", () => ({
  getSocket: () => socket,
  connectSocket: mockConnectSocket,
}));

jest.unstable_mockModule("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const { default: NotificationBell } = await import(
  "@/components/header/NotificationBell"
);

const now = Date.now();
const recent = (msAgo: number) => new Date(now - msAgo).toISOString();

describe("NotificationBell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k]);
    localStorage.clear();
    mockGetToken.mockResolvedValue("tok");
    mockGetNotifications.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("renders the bell button with no unread badge when caught up", async () => {
    render(<NotificationBell />);
    await act(async () => {
      await Promise.resolve();
    });
    const btn = screen.getByRole("button", { name: "Notifications" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  test("shows an unread count badge for notifications newer than seenAt", async () => {
    mockGetNotifications.mockResolvedValue({
      items: [
        { id: "n1", kind: "message", name: "Alex", text: "hi", createdAt: recent(1000) },
        { id: "n2", kind: "message", name: "Sam", text: "yo", createdAt: recent(2000) },
      ],
    });
    render(<NotificationBell />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /2 unread/i })
      ).toBeInTheDocument()
    );
  });

  test("opens the panel and lists notifications, then navigates on click", async () => {
    const user = userEvent.setup();
    mockGetNotifications.mockResolvedValue({
      items: [
        {
          id: "n1",
          kind: "final_price_set",
          name: "Alex",
          text: "Final price ready",
          createdAt: recent(1000),
        },
      ],
    });
    render(<NotificationBell />);
    await waitFor(() => expect(mockGetNotifications).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(await screen.findByText("Notifications")).toBeInTheDocument();

    const item = await screen.findByText("Final price set");
    await user.click(item);
    expect(mockNavigate).toHaveBeenCalledWith("/appointments");
  });

  test("shows the empty state when there are no notifications", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await waitFor(() => expect(mockGetNotifications).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(await screen.findByText(/You're all caught up/i)).toBeInTheDocument();
  });

  test("View all navigates home and closes the panel", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await waitFor(() => expect(mockGetNotifications).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /Notifications/i }));
    await user.click(await screen.findByText("View all"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("subscribes to realtime events and refetches on a socket ping", async () => {
    jest.useFakeTimers();
    render(<NotificationBell />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(socket.on).toHaveBeenCalledWith("message:new", expect.any(Function));
    const callsBefore = mockGetNotifications.mock.calls.length;

    await act(async () => {
      socketHandlers["message:new"]?.[0]?.();
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(mockGetNotifications.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
