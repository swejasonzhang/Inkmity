import { jest, describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

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
  test("should render floating bar", () => {
    const { container } = render(<FloatingBar role="Client" onAssistantOpen={jest.fn()} />);
    const placeholder = container.querySelector('[data-testid="floating-bar-placeholder"]');
    const portal = document.body.querySelector('.ink-assistant-btn');
    expect(placeholder || portal || container.firstChild).toBeInTheDocument();
  });
});
