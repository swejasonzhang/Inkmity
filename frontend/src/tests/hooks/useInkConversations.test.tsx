import { describe, test, expect } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { useInkConversations } from "@/hooks/useInkConversations";

describe("useInkConversations", () => {
  test("counts unread conversations from an id list and ignores cleared ones", () => {
    const { result } = renderHook(() =>
      useInkConversations({ role: "Client", unreadConversationIds: ["a", "b", "c"] })
    );
    expect(result.current.unreadConvoCount).toBe(3);

    act(() => {
      window.dispatchEvent(new CustomEvent("ink:conversation-opened", { detail: "a" }));
    });
    expect(result.current.unreadConvoCount).toBe(2);
  });

  test("falls back to the numeric unread count when no ids are provided", () => {
    const { result } = renderHook(() =>
      useInkConversations({ role: "Client", unreadConversationsCount: 5 })
    );
    expect(result.current.unreadConvoCount).toBe(5);
  });

  test("clamps negative numeric counts to zero", () => {
    const { result } = renderHook(() =>
      useInkConversations({ role: "Client", unreadConversationsCount: -4 })
    );
    expect(result.current.unreadConvoCount).toBe(0);
  });

  test("request count is always zero for clients", () => {
    const { result } = renderHook(() =>
      useInkConversations({ role: "Client", requestExists: true })
    );
    expect(result.current.requestCount).toBe(0);
  });

  test("artist request count reflects requestExists boolean", () => {
    const { result } = renderHook(() =>
      useInkConversations({ role: "Artist", requestExists: true })
    );
    expect(result.current.requestCount).toBe(1);
  });

  test("artist request count caps pending ids at one", () => {
    const { result } = renderHook(() =>
      useInkConversations({ role: "Artist", pendingRequestIds: ["r1", "r2"] })
    );
    expect(result.current.requestCount).toBe(1);
  });

  test("derived total sums unread messages and artist requests", () => {
    const { result } = renderHook(() =>
      useInkConversations({
        role: "Artist",
        unreadMessagesTotal: 4,
        pendingRequestIds: ["r1"],
      })
    );
    expect(result.current.derivedTotal).toBe(5);
  });

  test("derived total ignores requests for clients", () => {
    const { result } = renderHook(() =>
      useInkConversations({ role: "Client", unreadCount: 7 })
    );
    expect(result.current.derivedTotal).toBe(7);
  });

  test("responds to ink:open-messages and ink:close-messages events", () => {
    const { result } = renderHook(() => useInkConversations({ role: "Client" }));
    expect(result.current.open).toBe(false);

    act(() => window.dispatchEvent(new Event("ink:open-messages")));
    expect(result.current.open).toBe(true);

    act(() => window.dispatchEvent(new Event("ink:close-messages")));
    expect(result.current.open).toBe(false);
  });

  test("prunes cleared ids that are no longer in the unread list so they recount", () => {
    const { result, rerender } = renderHook(
      (props: { ids: string[] }) =>
        useInkConversations({ role: "Client", unreadConversationIds: props.ids }),
      { initialProps: { ids: ["a", "b"] } }
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("ink:conversation-read", { detail: "a" }));
    });
    expect(result.current.unreadConvoCount).toBe(1);

    rerender({ ids: ["a", "b"] });
    expect(result.current.unreadConvoCount).toBe(1);

    rerender({ ids: ["b"] });
    expect(result.current.unreadConvoCount).toBe(1);

    rerender({ ids: ["a", "b"] });
    expect(result.current.unreadConvoCount).toBe(2);
  });
});
