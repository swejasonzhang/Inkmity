import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";
import RequestsPanel from "@/components/dashboard/client/RequestsPanel";

describe("RequestsPanel", () => {
  const mockAuthFetch = jest.fn<(url: string, opts?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render requests panel", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ requests: [] }),
    } as Response);

    render(<RequestsPanel authFetch={mockAuthFetch} />);

    await waitFor(() => {
      expect(screen.getByText("Message Requests")).toBeInTheDocument();
    });
  });

  test("should display loading state", async () => {
    mockAuthFetch.mockImplementation(() => new Promise(() => {}));

    render(<RequestsPanel authFetch={mockAuthFetch} />);
    
    await waitFor(() => {
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
  });

  test("should display empty state when no requests", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ requests: [] }),
    } as Response);

    render(<RequestsPanel authFetch={mockAuthFetch} />);

    await waitFor(() => {
      expect(screen.getByText("No pending requests.")).toBeInTheDocument();
    });
  });

  test("should display requests when available", async () => {
    const mockRequests = [
      {
        _id: "req-1",
        senderId: "sender-1",
        receiverId: "receiver-1",
        text: "Test request message",
        createdAt: new Date().toISOString(),
      },
    ];

    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ requests: mockRequests }),
    } as Response);

    render(<RequestsPanel authFetch={mockAuthFetch} />);

    await waitFor(() => {
      expect(screen.getByText("Test request message")).toBeInTheDocument();
    });
  });

  test("should display request metadata when available", async () => {
    const mockRequests = [
      {
        _id: "req-1",
        senderId: "sender-1",
        receiverId: "receiver-1",
        text: "Test request",
        meta: {
          style: "Traditional",
          placement: "Arm",
          targetDateISO: "2024-12-25T00:00:00.000Z",
          referenceUrls: ["https://example.com/ref1"],
        },
        createdAt: new Date().toISOString(),
      },
    ];

    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ requests: mockRequests }),
    } as Response);

    render(<RequestsPanel authFetch={mockAuthFetch} />);

    await waitFor(() => {
      expect(screen.getByText(/Style: Traditional/i)).toBeInTheDocument();
      expect(screen.getByText(/Placement: Arm/i)).toBeInTheDocument();
      expect(screen.getByText(/Target:/i)).toBeInTheDocument();
      expect(screen.getByText(/Refs:/i)).toBeInTheDocument();
    });
  });

  test("should call accept when accept button is clicked", async () => {
    const user = userEvent.setup();
    const mockRequests = [
      {
        _id: "req-1",
        senderId: "sender-1",
        receiverId: "receiver-1",
        text: "Test request",
        createdAt: new Date().toISOString(),
      },
    ];

    mockAuthFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests: mockRequests }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests: [] }),
      } as Response);

    render(<RequestsPanel authFetch={mockAuthFetch} />);

    await waitFor(() => {
      expect(screen.getByText("Test request")).toBeInTheDocument();
    });

    const acceptButton = screen.getByRole("button", { name: /Accept/i });
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/messages/requests/req-1/accept", {
        method: "POST",
      });
    });
  });

  test("should call decline when decline button is clicked", async () => {
    const user = userEvent.setup();
    const mockRequests = [
      {
        _id: "req-1",
        senderId: "sender-1",
        receiverId: "receiver-1",
        text: "Test request",
        createdAt: new Date().toISOString(),
      },
    ];

    mockAuthFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests: mockRequests }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests: [] }),
      } as Response);

    render(<RequestsPanel authFetch={mockAuthFetch} />);

    await waitFor(() => {
      expect(screen.getByText("Test request")).toBeInTheDocument();
    });

    const declineButton = screen.getByRole("button", { name: /Decline/i });
    await user.click(declineButton);

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/messages/requests/req-1/decline", {
        method: "POST",
      });
    });
  });
});
