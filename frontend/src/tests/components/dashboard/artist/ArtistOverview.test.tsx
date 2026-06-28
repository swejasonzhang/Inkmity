import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import type { AppointmentWithUsers } from "@/components/dashboard/artist/ArtistOverview";

const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@/api", () => ({
  getConnectStatus: jest.fn<() => Promise<any>>().mockResolvedValue({
    connected: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    requirementsDue: [],
  }),
  startConnectOnboarding: jest.fn<() => Promise<any>>().mockResolvedValue({ url: "" }),
  getConnectLoginLink: jest.fn<() => Promise<any>>().mockResolvedValue({ url: "" }),
  getDocument: jest.fn<() => Promise<any>>().mockResolvedValue({ title: "", body: "", version: "1" }),
  signDocument: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  getArtistAnalytics: jest.fn<() => Promise<any>>().mockResolvedValue({
    tier: { key: "free", label: "Free", rank: 0, verified: false, payoutSpeed: "standard" },
    rating: 0,
    reviewsCount: 0,
    bookingsCount: 0,
    bookings: { total: 0, completed: 0, noShow: 0, cancelled: 0, completionRate: 0 },
    earnings: { paidOutCents: 0 },
    payoutSpeed: "standard",
  }),
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  ToastContainer: () => null,
}));

const { default: ArtistOverview } = await import("@/components/dashboard/artist/ArtistOverview");

const iso = (offsetDays: number, hour = 12) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

const appt = (over: Partial<AppointmentWithUsers>): AppointmentWithUsers =>
  ({
    _id: Math.random().toString(36).slice(2),
    status: "accepted",
    startAt: iso(1),
    endAt: iso(1, 13),
    appointmentType: "tattoo",
    priceCents: 0,
    ...over,
  }) as AppointmentWithUsers;

describe("ArtistOverview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
  });

  test("renders 'Nothing scheduled yet' when there are no upcoming appointments", async () => {
    render(<ArtistOverview appointments={[]} />);
    await waitFor(() => expect(screen.getByText("Nothing scheduled yet")).toBeInTheDocument(), { timeout: 3000 });
  });

  test("shows the next upcoming appointment with client name and type", async () => {
    render(
      <ArtistOverview
        appointments={[
          appt({ startAt: iso(2), endAt: iso(2, 13), client: { username: "Nina" }, appointmentType: "consultation" }),
        ]}
      />
    );
    await waitFor(() => expect(screen.getByText("Nina")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText(/Consultation/)).toBeInTheDocument();
    expect(screen.getByText(/Next up/)).toBeInTheDocument();
  });

  test("computes stat counts from appointments", async () => {
    render(
      <ArtistOverview
        appointments={[
          appt({ status: "pending", startAt: iso(1), endAt: iso(1, 13) }),
          appt({ status: "accepted", startAt: iso(0, 23), endAt: iso(1, 0) }),
          appt({ status: "completed", startAt: iso(-5) }),
          appt({ status: "no-show", startAt: iso(-2) }),
        ]}
      />
    );
    await waitFor(() => expect(screen.getByText("Pending")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("No-shows")).toBeInTheDocument();
  });

  test("renders the earnings and deposits money section", async () => {
    render(
      <ArtistOverview
        appointments={[
          appt({ status: "completed", startAt: iso(-1), priceCents: 20000 }),
          appt({ status: "accepted", startAt: iso(3), endAt: iso(3, 13), priceCents: 30000, depositPaidCents: 5000 }),
        ]}
      />
    );
    await waitFor(() => expect(screen.getByText("Earned this month")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText("Upcoming value")).toBeInTheDocument();
    expect(screen.getByText("Deposits held")).toBeInTheDocument();
    expect(screen.getByText("Avg / booking")).toBeInTheDocument();
    expect(screen.getByText("$50")).toBeInTheDocument();
  });

  test("renders skeletons while loading", () => {
    render(<ArtistOverview appointments={[]} loading />);
    expect(screen.queryByText("Nothing scheduled yet")).not.toBeInTheDocument();
  });
});
