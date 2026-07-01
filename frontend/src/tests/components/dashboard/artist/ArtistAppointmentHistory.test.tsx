import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
  useUser: () => ({ user: { id: "user-123" }, isSignedIn: true, isLoaded: true }),
}));

jest.unstable_mockModule("@/hooks/useBookingRealtime", () => ({
  useBookingRealtime: jest.fn(),
}));

global.fetch = jest.fn() as any;

const { default: ArtistAppointmentHistory } = await import("@/components/dashboard/artist/ArtistAppointmentHistory");

const soon = () => new Date(Date.now() + 86400000).toISOString();

describe("ArtistAppointmentHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => [] });
  });

  test("shows an upcoming client appointment once bookings load", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { _id: "b1", clientId: "c1", startAt: soon(), status: "accepted", appointmentType: "tattoo_session", client: { username: "Sam Client" } },
      ],
    });

    render(<ArtistAppointmentHistory />);

    expect(await screen.findByText("Sam Client")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  test("falls back to 'Unknown Client' when the booking has no client name", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { _id: "b2", clientId: "c2", startAt: soon(), status: "pending", appointmentType: "consultation" },
      ],
    });

    render(<ArtistAppointmentHistory />);

    expect(await screen.findByText("Unknown Client")).toBeInTheDocument();
  });
});
