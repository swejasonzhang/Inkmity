import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, waitFor } from "@/__tests__/setup/test-utils";

const mockGetToken = jest.fn<() => Promise<string>>();
const mockGetSocket = jest.fn();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}));

jest.unstable_mockModule("@/lib/socket", () => ({
  getSocket: mockGetSocket,
}));

global.fetch = jest.fn() as any;

const { default: ArtistCalendarManager } = await import("@/components/calender/ArtistCalendarManager");

describe("ArtistCalendarManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockGetSocket.mockReturnValue({
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connected: true,
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        timezone: "America/New_York",
        exceptions: {},
      }),
    });
  });

  test("should render calendar manager", async () => {
    const { container } = render(<ArtistCalendarManager artistId="artist-123" />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
