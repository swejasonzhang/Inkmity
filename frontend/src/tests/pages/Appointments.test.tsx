import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, act, waitFor, fireEvent } from "@/tests/setup/test-utils";

const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue("tok");
const useUser = jest.fn(() => ({ user: { id: "u1" } }));
const useRole = jest.fn<() => { role: string; isLoaded: boolean }>(() => ({
  role: "artist",
  isLoaded: true,
}));
const getAppointments = jest.fn<() => Promise<any>>();
const acceptAppointment = jest.fn<() => Promise<any>>().mockResolvedValue({});
const denyAppointment = jest.fn<() => Promise<any>>().mockResolvedValue({});
const useBookingRealtime = jest.fn();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken }),
  useUser,
}));
jest.unstable_mockModule("@/hooks/useRole", () => ({ useRole }));
jest.unstable_mockModule("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "dark" }) }));
jest.unstable_mockModule("@/hooks/useScrollLock", () => ({ useScrollLock: jest.fn() }));
jest.unstable_mockModule("@/hooks/useBookingRealtime", () => ({ useBookingRealtime }));
jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
  ToastContainer: () => <div data-testid="toast" />,
}));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/ui/LazyReveal", () => ({
  default: ({ loading, skeleton, children }: any) => (loading ? skeleton : children),
}));
const stub = (id: string) => ({ default: () => <div data-testid={id} /> });
jest.unstable_mockModule("@/components/dashboard/artist/ArtistWaitlist", () => stub("waitlist"));
jest.unstable_mockModule("@/components/dashboard/shared/SketchPanel", () => stub("sketch"));
jest.unstable_mockModule("@/components/dashboard/client/PaymentBreakdown", () => stub("payment"));
jest.unstable_mockModule("@/components/dashboard/client/IntakeFormPanel", () => stub("intake"));
jest.unstable_mockModule("@/components/dashboard/client/TipModal", () => stub("tip"));
jest.unstable_mockModule("@/components/dashboard/shared/ReviewPromptModal", () => stub("review"));
jest.unstable_mockModule("@/components/dashboard/shared/PromptModal", () => ({
  default: () => <div data-testid="prompt" />,
}));
jest.unstable_mockModule("@/api", () => ({
  getAppointments,
  acceptAppointment,
  denyAppointment,
  reportArtistNoShow: jest.fn(),
  respondArtistNoShow: jest.fn(),
  checkInBooking: jest.fn(),
  setBookingFinalPrice: jest.fn(),
  approveBookingFinalPrice: jest.fn(),
  startBookingVerification: jest.fn(),
  verifyBookingCompletion: jest.fn(),
}));

const { default: Appointments } = await import("@/pages/Appointments");

const appt = (over: Record<string, any> = {}) => ({
  _id: "a1",
  status: "pending",
  appointmentType: "consultation",
  startAt: "2026-02-01T10:00:00Z",
  endAt: "2026-02-01T11:00:00Z",
  client: { username: "Cleo" },
  artist: { username: "Artie" },
  ...over,
});

describe("Appointments page", () => {
  beforeEach(() => {
    useRole.mockReturnValue({ role: "artist", isLoaded: true });
    getAppointments.mockReset().mockResolvedValue([]);
    acceptAppointment.mockClear();
    denyAppointment.mockClear();
  });

  test("renders the heading and empty state when there are no appointments", async () => {
    await act(async () => {
      render(<Appointments />);
    });
    await waitFor(() =>
      expect(screen.getByText("No appointments found")).toBeInTheDocument()
    );
    expect(
      screen.getByRole("heading", { name: "Appointments" })
    ).toBeInTheDocument();
  });

  test("renders pending appointment cards with the other user's name", async () => {
    getAppointments.mockResolvedValue([appt()]);
    await act(async () => {
      render(<Appointments />);
    });
    await waitFor(() => expect(screen.getByText("Cleo")).toBeInTheDocument());
    expect(screen.getByText("Consultation")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Past")).toBeInTheDocument();
  });

  test("artist can accept a pending appointment", async () => {
    getAppointments.mockResolvedValue([appt()]);
    await act(async () => {
      render(<Appointments />);
    });
    await waitFor(() => expect(screen.getByText("Accept")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("Accept"));
    });
    await waitFor(() =>
      expect(acceptAppointment).toHaveBeenCalledWith("a1", "tok")
    );
  });

  test("switching to the Past tab shows non-pending appointments", async () => {
    getAppointments.mockResolvedValue([
      appt({ _id: "a2", status: "completed", client: { username: "Past Client" } }),
    ]);
    await act(async () => {
      render(<Appointments />);
    });
    await waitFor(() =>
      expect(screen.getByText("No pending appointments.")).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Past"));
    });
    expect(screen.getByText("Past Client")).toBeInTheDocument();
  });

  test("clients do not see the artist waitlist and see no accept button", async () => {
    useRole.mockReturnValue({ role: "client", isLoaded: true });
    getAppointments.mockResolvedValue([appt()]);
    await act(async () => {
      render(<Appointments />);
    });
    await waitFor(() => expect(screen.getByText("Artie")).toBeInTheDocument());
    expect(screen.queryByTestId("waitlist")).not.toBeInTheDocument();
    expect(screen.queryByText("Accept")).not.toBeInTheDocument();
  });
});
