import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";

const mockFetch = jest.fn<() => Promise<any>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: async () => "token" }),
}));

jest.unstable_mockModule("@/api", () => ({
  fetchPaymentBreakdown: mockFetch,
}));

const { default: PaymentBreakdown } = await import(
  "@/components/dashboard/client/PaymentBreakdown"
);

describe("PaymentBreakdown", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test("shows a shimmer placeholder while loading", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(<PaymentBreakdown bookingId="b1" />);
    expect(container.querySelector(".ink-shimmer")).toBeInTheDocument();
  });

  test("renders the estimate breakdown for a non-completed booking", async () => {
    mockFetch.mockResolvedValue({
      priceCents: 20000,
      platformFeeCents: 1000,
      clientTotalCents: 21000,
      baseFeeWaived: false,
      status: "confirmed",
    });
    render(<PaymentBreakdown bookingId="b1" />);
    expect(await screen.findByText("Estimate")).toBeInTheDocument();
    expect(screen.getByText("You'll pay")).toBeInTheDocument();
    expect(screen.getByText("$210.00")).toBeInTheDocument();
  });

  test("renders 'Charged' and 'You paid' for completed bookings with waived base fee", async () => {
    mockFetch.mockResolvedValue({
      priceCents: 20000,
      platformFeeCents: 0,
      clientTotalCents: 20000,
      baseFeeWaived: true,
      status: "completed",
    });
    render(<PaymentBreakdown bookingId="b1" />);
    expect(await screen.findByText("Charged")).toBeInTheDocument();
    expect(screen.getByText("You paid")).toBeInTheDocument();
    expect(screen.getByText(/base waived/i)).toBeInTheDocument();
  });

  test("renders nothing when the price is zero", async () => {
    mockFetch.mockResolvedValue({
      priceCents: 0,
      platformFeeCents: 0,
      clientTotalCents: 0,
      status: "confirmed",
    });
    const { container } = render(<PaymentBreakdown bookingId="b1" />);
    await waitFor(() => expect(container.querySelector(".ink-shimmer")).toBeNull());
    expect(container.firstChild).toBeNull();
  });

  test("renders nothing when the fetch errors", async () => {
    mockFetch.mockRejectedValue(new Error("nope"));
    const { container } = render(<PaymentBreakdown bookingId="b1" />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });
});
