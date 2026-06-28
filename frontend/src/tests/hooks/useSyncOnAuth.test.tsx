import { jest, describe, test, expect, beforeEach, beforeAll } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";

const mockGetMe = jest.fn<(opts?: any) => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();
const mockUseUser = jest.fn();

jest.unstable_mockModule("@/api", () => ({
  getMe: mockGetMe,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useUser: () => mockUseUser(),
  useAuth: () => ({ getToken: mockGetToken }),
}));

let useSyncOnAuth: typeof import("@/hooks/useSyncOnAuth").useSyncOnAuth;

beforeAll(async () => {
  ({ useSyncOnAuth } = await import("@/hooks/useSyncOnAuth"));
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue("token");
  mockGetMe.mockResolvedValue({});
});

describe("useSyncOnAuth", () => {
  test("does not sync when signed out", () => {
    mockUseUser.mockReturnValue({ isSignedIn: false, user: null });
    renderHook(() => useSyncOnAuth());
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  test("calls getMe once when signed in", async () => {
    mockUseUser.mockReturnValue({ isSignedIn: true, user: { id: "sync-1" } });
    renderHook(() => useSyncOnAuth());

    await waitFor(() => expect(mockGetMe).toHaveBeenCalledTimes(1));
    expect(mockGetMe).toHaveBeenCalledWith(
      expect.objectContaining({ token: "token" })
    );
  });

  test("does not re-sync the same user on rerender", async () => {
    mockUseUser.mockReturnValue({ isSignedIn: true, user: { id: "sync-2" } });
    const { rerender } = renderHook(() => useSyncOnAuth());

    await waitFor(() => expect(mockGetMe).toHaveBeenCalledTimes(1));
    rerender();
    rerender();
    expect(mockGetMe).toHaveBeenCalledTimes(1);
  });

  test("swallows sync errors without throwing", async () => {
    mockUseUser.mockReturnValue({ isSignedIn: true, user: { id: "sync-3" } });
    mockGetMe.mockRejectedValueOnce({ status: 500 });

    const { result } = renderHook(() => useSyncOnAuth());
    await waitFor(() => expect(mockGetMe).toHaveBeenCalledTimes(1));
    expect(result.current).toBeUndefined();
  });

  test("re-syncs when the signed-in user changes", async () => {
    mockUseUser.mockReturnValue({ isSignedIn: true, user: { id: "sync-a" } });
    const { rerender } = renderHook(() => useSyncOnAuth());
    await waitFor(() => expect(mockGetMe).toHaveBeenCalledTimes(1));

    mockUseUser.mockReturnValue({ isSignedIn: true, user: { id: "sync-b" } });
    rerender();
    await waitFor(() => expect(mockGetMe).toHaveBeenCalledTimes(2));
  });
});
