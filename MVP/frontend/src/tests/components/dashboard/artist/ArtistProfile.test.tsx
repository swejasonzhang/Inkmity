import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, waitFor } from "@/__tests__/setup/test-utils";

const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
  useUser: () => ({
    user: { id: "user-123" },
  }),
}));

global.fetch = jest.fn() as any;

const { default: ArtistProfile } = await import("@/components/dashboard/artist/ArtistProfile");

describe("ArtistProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  test("should render artist profile", async () => {
    const { container } = render(<ArtistProfile />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
