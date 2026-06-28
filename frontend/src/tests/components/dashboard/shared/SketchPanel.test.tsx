import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";
import type { Sketch } from "@/api";

const mockGetSketches = jest.fn<() => Promise<Sketch[]>>();
const mockCreateSketch = jest.fn<() => Promise<any>>();
const mockRespondToSketch = jest.fn<() => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();
const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.unstable_mockModule("@/api", () => ({
  getSketches: mockGetSketches,
  createSketch: mockCreateSketch,
  respondToSketch: mockRespondToSketch,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: toastSuccess, error: toastError },
  ToastContainer: () => null,
}));

const { default: SketchPanel } = await import("@/components/dashboard/shared/SketchPanel");

const sketch = (over: Partial<Sketch>): Sketch =>
  ({
    _id: "s1",
    bookingId: "b1",
    artistId: "a1",
    clientId: "c1",
    imageUrls: ["https://img/1.png"],
    status: "pending",
    ...over,
  }) as Sketch;

describe("SketchPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockCreateSketch.mockResolvedValue({});
    mockRespondToSketch.mockResolvedValue({});
  });

  test("renders nothing for a client when there are no sketches", async () => {
    mockGetSketches.mockResolvedValue([]);
    const { container } = render(<SketchPanel bookingId="b1" isArtist={false} isClient={true} />);
    await waitFor(() => expect(mockGetSketches).toHaveBeenCalled(), { timeout: 3000 });
    expect(container.firstChild).toBeNull();
  });

  test("artist sees the share form even with no sketches", async () => {
    mockGetSketches.mockResolvedValue([]);
    render(<SketchPanel bookingId="b1" isArtist={true} isClient={false} />);
    await waitFor(() => expect(screen.getByText("Sketches")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByPlaceholderText(/Sketch image URL/i)).toBeInTheDocument();
  });

  test("renders existing sketches with note and status", async () => {
    mockGetSketches.mockResolvedValue([
      sketch({ _id: "s1", note: "first pass", status: "approved" }),
    ]);
    render(<SketchPanel bookingId="b1" isArtist={false} isClient={true} />);
    await waitFor(() => expect(screen.getByText("first pass")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  test("artist can share a sketch with comma-separated urls", async () => {
    const user = userEvent.setup();
    mockGetSketches.mockResolvedValue([]);
    render(<SketchPanel bookingId="b1" isArtist={true} isClient={false} />);
    await waitFor(() => expect(screen.getByText("Sketches")).toBeInTheDocument(), { timeout: 3000 });

    await user.type(screen.getByPlaceholderText(/Sketch image URL/i), "https://a.png, https://b.png");
    await user.type(screen.getByPlaceholderText("Note (optional)"), "draft");
    await user.click(screen.getByRole("button", { name: /Share sketch/i }));

    await waitFor(() =>
      expect(mockCreateSketch).toHaveBeenCalledWith(
        { bookingId: "b1", imageUrls: ["https://a.png", "https://b.png"], note: "draft" },
        "mock-token"
      )
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  test("shows error toast when sharing fails", async () => {
    const user = userEvent.setup();
    mockGetSketches.mockResolvedValue([]);
    mockCreateSketch.mockRejectedValue(new Error("share failed"));
    render(<SketchPanel bookingId="b1" isArtist={true} isClient={false} />);
    await waitFor(() => expect(screen.getByText("Sketches")).toBeInTheDocument(), { timeout: 3000 });

    await user.type(screen.getByPlaceholderText(/Sketch image URL/i), "https://a.png");
    await user.click(screen.getByRole("button", { name: /Share sketch/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("share failed", { theme: "dark" }));
  });

  test("client can approve a pending sketch", async () => {
    const user = userEvent.setup();
    mockGetSketches.mockResolvedValue([sketch({ _id: "s9", status: "pending" })]);
    render(<SketchPanel bookingId="b1" isArtist={false} isClient={true} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument(), { timeout: 3000 });

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(mockRespondToSketch).toHaveBeenCalledWith("s9", "approve", "", "mock-token")
    );
  });

  test("client requesting changes opens prompt and submits the change note", async () => {
    const user = userEvent.setup();
    mockGetSketches.mockResolvedValue([sketch({ _id: "s7", status: "pending" })]);
    render(<SketchPanel bookingId="b1" isArtist={false} isClient={true} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Request changes" })).toBeInTheDocument(), { timeout: 3000 });

    await user.click(screen.getByRole("button", { name: "Request changes" }));
    await waitFor(() => expect(screen.getByPlaceholderText(/thinner linework/i)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/thinner linework/i), "smaller please");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() =>
      expect(mockRespondToSketch).toHaveBeenCalledWith("s7", "request_changes", "smaller please", "mock-token")
    );
  });
});
