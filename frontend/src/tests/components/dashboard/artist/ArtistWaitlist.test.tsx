import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import type { ArtistWaitlistEntry } from "@/api";

const mockGetArtistWaitlist = jest.fn<() => Promise<ArtistWaitlistEntry[]>>();
const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@/api", () => ({
  getArtistWaitlist: mockGetArtistWaitlist,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

const { default: ArtistWaitlist } = await import("@/components/dashboard/artist/ArtistWaitlist");

const entry = (over: Partial<ArtistWaitlistEntry>): ArtistWaitlistEntry =>
  ({
    _id: "w1",
    artistId: "a1",
    clientId: "c1",
    status: "active",
    ...over,
  }) as ArtistWaitlistEntry;

describe("ArtistWaitlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
  });

  test("renders nothing when there are no entries", async () => {
    mockGetArtistWaitlist.mockResolvedValue([]);
    const { container } = render(<ArtistWaitlist />);
    await waitFor(() => expect(mockGetArtistWaitlist).toHaveBeenCalled(), { timeout: 3000 });
    expect(container.firstChild).toBeNull();
  });

  test("renders nothing when the fetch fails", async () => {
    mockGetArtistWaitlist.mockRejectedValue(new Error("nope"));
    const { container } = render(<ArtistWaitlist />);
    await waitFor(() => expect(mockGetArtistWaitlist).toHaveBeenCalled(), { timeout: 3000 });
    expect(container.firstChild).toBeNull();
  });

  test("renders the waitlist with client names, tier and status", async () => {
    mockGetArtistWaitlist.mockResolvedValue([
      entry({ _id: "w1", client: { username: "Alice" }, tierLabel: "VIP", status: "notified" }),
      entry({ _id: "w2", client: { username: "Bob" }, status: "active" }),
    ]);
    render(<ArtistWaitlist />);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText(/Waitlist \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("Notified")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
  });

  test("falls back to 'Client' when username is missing", async () => {
    mockGetArtistWaitlist.mockResolvedValue([entry({ _id: "w3", client: null })]);
    render(<ArtistWaitlist />);
    await waitFor(() => expect(screen.getByText("Client")).toBeInTheDocument(), { timeout: 3000 });
  });
});
