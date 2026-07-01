import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
  useUser: () => ({
    user: { id: "user-123" },
    isSignedIn: true,
    isLoaded: true,
  }),
}));

jest.unstable_mockModule("@/api", () => ({
  API_URL: "http://localhost:5005",
  addReview: jest.fn<() => Promise<any>>().mockResolvedValue({}),
}));

jest.unstable_mockModule("@/hooks/useBookingRealtime", () => ({
  useBookingRealtime: jest.fn(),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  ToastContainer: () => null,
}));

global.fetch = jest.fn() as any;

const { default: ClientAppointmentHistory } = await import("@/components/dashboard/client/ClientAppointmentHistory");

describe("ClientAppointmentHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  const soon = () => new Date(Date.now() + 86400000).toISOString();

  test("shows the client's upcoming appointment with the artist and status", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { _id: "b1", artistId: "a1", startAt: soon(), status: "accepted", appointmentType: "tattoo_session", artist: { username: "Ink Master" } },
      ],
    });

    render(<ClientAppointmentHistory />);

    expect(await screen.findByText("Ink Master")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  test("falls back to 'Unknown Artist' when the booking has no artist name", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { _id: "b2", artistId: "a2", startAt: soon(), status: "pending", appointmentType: "consultation" },
      ],
    });

    render(<ClientAppointmentHistory />);

    expect(await screen.findByText("Unknown Artist")).toBeInTheDocument();
  });
});
