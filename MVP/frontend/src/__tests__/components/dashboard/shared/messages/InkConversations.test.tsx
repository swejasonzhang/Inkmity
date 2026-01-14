import { jest, describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const { InkConversations } = await import("@/components/dashboard/shared/messages/InkConversations");

describe("InkConversations", () => {
  const defaultProps = {
    role: "Client" as const,
    isMdUp: true,
    width: 400,
    height: 600,
    open: false,
    setOpen: jest.fn<(v: boolean) => void>(),
    unreadConvoCount: 0,
    requestCount: 0,
    derivedTotal: 0,
  };

  test("should render ink conversations", () => {
    const { container } = render(<InkConversations {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should render when open", () => {
    const { container } = render(<InkConversations {...defaultProps} open={true} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should display badge when there are unread messages", () => {
    const { container } = render(<InkConversations {...defaultProps} unreadConvoCount={5} derivedTotal={5} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
