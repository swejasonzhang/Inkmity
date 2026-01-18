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

jest.unstable_mockModule("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: jest.fn(),
  }),
}));

global.fetch = jest.fn() as any;

const { default: ClientProfile } = await import("@/components/dashboard/client/ClientProfile");

describe("ClientProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  test("should render client profile", async () => {
    const { container } = render(<ClientProfile />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
