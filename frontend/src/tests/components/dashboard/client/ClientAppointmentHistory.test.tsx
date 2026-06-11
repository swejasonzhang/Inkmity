import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, waitFor } from "@/tests/setup/test-utils";

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

  test("should render client appointment history", async () => {
    const { container } = render(<ClientAppointmentHistory />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
