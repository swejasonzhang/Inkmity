import type React from "react";
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";
import type { ConnectStatus } from "@/api";

const mockGetConnectStatus = jest.fn<() => Promise<ConnectStatus>>();
const mockStartConnectOnboarding = jest.fn<() => Promise<{ url: string }>>();
const mockGetConnectLoginLink = jest.fn<() => Promise<{ url: string }>>();
const mockGetDocument = jest.fn<() => Promise<any>>();
const mockSignDocument = jest.fn<() => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();
const mockNavigate = jest.fn();

jest.unstable_mockModule("@/api", () => ({
  getConnectStatus: mockGetConnectStatus,
  startConnectOnboarding: mockStartConnectOnboarding,
  getConnectLoginLink: mockGetConnectLoginLink,
  getDocument: mockGetDocument,
  signDocument: mockSignDocument,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  ToastContainer: () => null,
}));

jest.unstable_mockModule("react-router-dom", () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNavigate: () => mockNavigate,
}));

const { default: PayoutSetup } = await import("@/components/dashboard/artist/PayoutSetup");

const status = (over: Partial<ConnectStatus>): ConnectStatus => ({
  connected: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  requirementsDue: [],
  ...over,
});

describe("PayoutSetup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockGetDocument.mockResolvedValue({ title: "Agreement", body: "terms", version: "1" });
    mockSignDocument.mockResolvedValue({});
  });

  test("shows active state when charges are enabled", async () => {
    mockGetConnectStatus.mockResolvedValue(status({ connected: true, chargesEnabled: true, payoutsEnabled: true }));
    render(<PayoutSetup />);
    await waitFor(() => expect(screen.getByText(/Payouts active/i)).toBeInTheDocument(), { timeout: 3000 });
  });

  test("notes pending payout details when payouts not yet enabled", async () => {
    mockGetConnectStatus.mockResolvedValue(status({ connected: true, chargesEnabled: true, payoutsEnabled: false }));
    render(<PayoutSetup />);
    await waitFor(() => expect(screen.getByText(/payout details pending/i)).toBeInTheDocument(), { timeout: 3000 });
  });

  test("opens the payouts dashboard via Manage", async () => {
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
    mockGetConnectStatus.mockResolvedValue(status({ connected: true, chargesEnabled: true, payoutsEnabled: true }));
    mockGetConnectLoginLink.mockResolvedValue({ url: "https://dashboard.stripe.test" });
    const user = userEvent.setup();
    render(<PayoutSetup />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Payouts/i })).toBeInTheDocument(), { timeout: 3000 });
    await user.click(screen.getByRole("button", { name: /Payouts/i }));

    await waitFor(() => expect(mockGetConnectLoginLink).toHaveBeenCalled());
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith("https://dashboard.stripe.test", "_blank", "noopener")
    );
    openSpy.mockRestore();
  });

  test("redirects to /profile when redirectToProfile and not ready", async () => {
    mockGetConnectStatus.mockResolvedValue(status({ connected: false }));
    const user = userEvent.setup();
    render(<PayoutSetup redirectToProfile />);

    await waitFor(() => expect(screen.getByText(/Finish payment setup/i)).toBeInTheDocument(), { timeout: 3000 });
    await user.click(screen.getByRole("button", { name: /Set up payouts/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/profile");
  });

  test("starts onboarding and redirects the browser when Connect is clicked", async () => {
    const original = window.location;
    delete (window as any).location;
    (window as any).location = { href: "" };
    mockGetConnectStatus.mockResolvedValue(status({ connected: false }));
    mockStartConnectOnboarding.mockResolvedValue({ url: "https://connect.stripe.test" });
    const user = userEvent.setup();
    render(<PayoutSetup />);

    await waitFor(() => expect(screen.getByText(/Connect your bank with Stripe/i)).toBeInTheDocument(), { timeout: 3000 });
    await user.click(screen.getByRole("button", { name: /Connect your bank with Stripe/i }));

    await waitFor(() => expect(window.location.href).toBe("https://connect.stripe.test"));
    (window as any).location = original;
  });

  test("opens the agreement modal when onboarding requires agreement", async () => {
    mockGetConnectStatus.mockResolvedValue(status({ connected: false }));
    mockStartConnectOnboarding.mockRejectedValue({ status: 403, body: { error: "agreement_required" } });
    const user = userEvent.setup();
    render(<PayoutSetup />);

    await waitFor(() => expect(screen.getByText(/Connect your bank with Stripe/i)).toBeInTheDocument(), { timeout: 3000 });
    await user.click(screen.getByRole("button", { name: /Connect your bank with Stripe/i }));

    await waitFor(() => expect(screen.getByText("Agreement")).toBeInTheDocument(), { timeout: 3000 });
  });

  test("shows an error message when onboarding fails", async () => {
    mockGetConnectStatus.mockResolvedValue(status({ connected: false }));
    mockStartConnectOnboarding.mockRejectedValue(new Error("onboarding broke"));
    const user = userEvent.setup();
    render(<PayoutSetup />);

    await waitFor(() => expect(screen.getByText(/Connect your bank with Stripe/i)).toBeInTheDocument(), { timeout: 3000 });
    await user.click(screen.getByRole("button", { name: /Connect your bank with Stripe/i }));

    await waitFor(() => expect(screen.getByText("onboarding broke")).toBeInTheDocument());
  });
});
