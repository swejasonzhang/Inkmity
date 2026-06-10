import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";

jest.unstable_mockModule("@/components/ui/spinner", () => ({
  Spinner: () => <div data-testid="loading-spinner" role="status" aria-label="Loading">Loading...</div>,
}));

const { default: RequestPanel } = await import("@/components/dashboard/shared/messages/requestPanel");

describe("RequestPanel", () => {
  const mockAuthFetch = jest.fn<() => Promise<Response>>();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render request panel", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ requests: [] }),
    } as Response);

    const { container } = render(
      <RequestPanel authFetch={mockAuthFetch} onOpenConversation={jest.fn()} />
    );

    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  test("should display loading state", () => {
    mockAuthFetch.mockImplementation(() => new Promise(() => {}));

    render(<RequestPanel authFetch={mockAuthFetch} onOpenConversation={jest.fn()} />);
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });
});
