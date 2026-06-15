import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { TextEncoder, TextDecoder } from "util";
import { render, screen, waitFor, fireEvent } from "@/tests/setup/test-utils";

(globalThis as any).TextEncoder ??= TextEncoder;
(globalThis as any).TextDecoder ??= TextDecoder;

const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.unstable_mockModule("@/api", () => ({
  API_URL: "http://test.local",
}));

const { default: ChatBot } = await import("@/components/dashboard/shared/ChatBot");

function streamingResponse(chunks: string[]) {
  const enc = new TextEncoder();
  const encoded = chunks.map((c) => enc.encode(c));
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () =>
          i < encoded.length
            ? { done: false, value: encoded[i++] }
            : { done: true, value: undefined },
      }),
    },
  };
}

describe("ChatBot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("tok");
    global.fetch = jest.fn() as any;
  });

  test("renders the empty state and suggestions", () => {
    render(<ChatBot />);
    expect(screen.getByText(/how can i help with your tattoo/i)).toBeInTheDocument();
    expect(screen.getByText(/turn my idea into a brief/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message the assistant/i)).toBeInTheDocument();
  });

  test("streams an assistant reply when a message is sent", async () => {
    (global.fetch as any).mockResolvedValue(streamingResponse(["Here's ", "a brief."]));
    render(<ChatBot />);

    const input = screen.getByLabelText(/message the assistant/i);
    fireEvent.change(input, { target: { value: "help me" } });
    fireEvent.click(screen.getByLabelText(/^send$/i));

    expect(await screen.findByText("help me")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Here's a brief.")).toBeInTheDocument());

    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("http://test.local/assistant/chat");
    expect(JSON.parse(opts.body).messages.at(-1)).toEqual({ role: "user", content: "help me" });
  });

  test("shows an error when the assistant is unavailable", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 503, body: null });
    render(<ChatBot />);
    fireEvent.change(screen.getByLabelText(/message the assistant/i), { target: { value: "hi" } });
    fireEvent.click(screen.getByLabelText(/^send$/i));
    expect(await screen.findByText(/isn't available right now/i)).toBeInTheDocument();
  });
});
