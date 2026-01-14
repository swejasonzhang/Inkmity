import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, waitFor } from "@/__tests__/setup/test-utils";

const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}));

global.fetch = jest.fn() as any;

const { default: ArtistAppointmentHistory } = await import("@/components/dashboard/artist/ArtistAppointmentHistory");

describe("ArtistAppointmentHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  test("should render artist appointment history", async () => {
    const { container } = render(<ArtistAppointmentHistory />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
