import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("@/lib/socket", () => ({
  socket: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connected: true,
  },
  connectSocket: jest.fn(),
}));

const { default: ChatWindow } = await import("@/components/dashboard/shared/ChatWindow");

describe("ChatWindow", () => {
  const defaultProps = {
    currentUserId: "user-123",
    isArtist: false,
    role: "client" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render chat window", () => {
    const { container } = render(<ChatWindow {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
