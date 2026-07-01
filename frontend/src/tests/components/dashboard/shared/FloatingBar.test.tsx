import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

jest.unstable_mockModule("@/hooks/useInkConversations", () => ({
  useInkConversations: () => ({
    btnRef: { current: null },
    open: false,
    setOpen: jest.fn(),
    unreadConvoCount: 0,
    requestCount: 0,
    derivedTotal: 0,
  }),
}));

jest.unstable_mockModule("@/components/dashboard/shared/messages/InkConversations", () => ({
  InkConversations: () => null,
}));

const { default: FloatingBar } = await import("@/components/dashboard/shared/FloatingBar");

describe("FloatingBar", () => {
  test("the assistant is gated while locked — clicking it does nothing", () => {
    const onAssistantOpen = jest.fn();
    render(<FloatingBar role="Client" assistantLocked onAssistantOpen={onAssistantOpen} />);

    const btn = screen.getAllByRole("button", { name: /assistant.*coming soon/i })[0];
    btn.click();
    expect(onAssistantOpen).not.toHaveBeenCalled();
  });

  test("once unlocked, clicking the assistant opens it", () => {
    const onAssistantOpen = jest.fn();
    render(<FloatingBar role="Client" assistantLocked={false} onAssistantOpen={onAssistantOpen} />);

    screen.getAllByRole("button", { name: /open assistant/i })[0].click();
    expect(onAssistantOpen).toHaveBeenCalledTimes(1);
  });
});
