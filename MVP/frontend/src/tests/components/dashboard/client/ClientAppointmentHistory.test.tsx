import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, waitFor } from "@/__tests__/setup/test-utils";

const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
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
