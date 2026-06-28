import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockGetToken = jest.fn(async () => "token");
const mockList = jest.fn<() => Promise<any>>();
const mockDelete = jest.fn<() => Promise<any>>();
const mockSetupIntent = jest.fn<() => Promise<any>>();
const mockToastError = jest.fn();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.unstable_mockModule("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

jest.unstable_mockModule("@/hooks/useScrollLock", () => ({
  useScrollLock: jest.fn(),
}));

jest.unstable_mockModule("@/lib/stripe", () => ({
  stripePromise: Promise.resolve(null),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { error: mockToastError, success: jest.fn() },
}));

jest.unstable_mockModule("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.unstable_mockModule("@/api", () => ({
  createClientSetupIntent: mockSetupIntent,
  listClientPaymentMethods: mockList,
  deleteClientPaymentMethod: mockDelete,
}));

const { default: PaymentMethods } = await import(
  "@/components/dashboard/client/PaymentMethods"
);

describe("PaymentMethods", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  test("shows a shimmer while loading then the empty state", async () => {
    mockList.mockResolvedValue({ methods: [] });
    const { container } = render(<PaymentMethods />);
    expect(container.querySelector(".ink-shimmer")).toBeInTheDocument();
    expect(
      await screen.findByText(/No payment method linked yet/i)
    ).toBeInTheDocument();
  });

  test("renders saved card and bank methods", async () => {
    mockList.mockResolvedValue({
      methods: [
        {
          id: "pm1",
          type: "card",
          brand: "visa",
          last4: "4242",
          expMonth: 4,
          expYear: 2030,
          isDefault: true,
        },
        {
          id: "pm2",
          type: "us_bank_account",
          bankName: "Chase",
          last4: "6789",
        },
      ],
    });
    render(<PaymentMethods />);
    expect(await screen.findByText(/Visa •••• 4242/)).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText(/Expires 04\/30/)).toBeInTheDocument();
    expect(screen.getByText(/Chase •••• 6789/)).toBeInTheDocument();
  });

  test("falls back to empty methods when the list call throws", async () => {
    mockList.mockRejectedValue(new Error("boom"));
    render(<PaymentMethods />);
    expect(
      await screen.findByText(/No payment method linked yet/i)
    ).toBeInTheDocument();
  });

  test("removes a payment method", async () => {
    mockList
      .mockResolvedValueOnce({
        methods: [{ id: "pm1", type: "card", brand: "visa", last4: "4242" }],
      })
      .mockResolvedValueOnce({ methods: [] });
    mockDelete.mockResolvedValue({});
    const user = userEvent.setup();
    render(<PaymentMethods />);
    await screen.findByText(/Visa •••• 4242/);
    await user.click(screen.getByRole("button", { name: /remove payment method/i }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("pm1", "token"));
    await waitFor(() =>
      expect(screen.getByText(/No payment method linked yet/i)).toBeInTheDocument()
    );
  });

  test("toasts when removal fails", async () => {
    mockList.mockResolvedValue({
      methods: [{ id: "pm1", type: "card", brand: "visa", last4: "4242" }],
    });
    mockDelete.mockRejectedValue(new Error("nope"));
    const user = userEvent.setup();
    render(<PaymentMethods />);
    await screen.findByText(/Visa •••• 4242/);
    await user.click(screen.getByRole("button", { name: /remove payment method/i }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  });

  test("opens the add-payment modal", async () => {
    mockList.mockResolvedValue({ methods: [] });
    mockSetupIntent.mockResolvedValue({ clientSecret: "cs_test" });
    const user = userEvent.setup();
    render(<PaymentMethods />);
    await screen.findByText(/No payment method linked yet/i);
    await user.click(screen.getByRole("button", { name: /add payment method/i }));
    await waitFor(() =>
      expect(document.body.querySelector('[role="dialog"]')).toBeInTheDocument()
    );
    expect(screen.getByText("Add a payment method")).toBeInTheDocument();
  });

  test("toasts and closes when the setup intent fails", async () => {
    mockList.mockResolvedValue({ methods: [] });
    mockSetupIntent.mockRejectedValue(new Error("nope"));
    const user = userEvent.setup();
    render(<PaymentMethods />);
    await screen.findByText(/No payment method linked yet/i);
    await user.click(screen.getByRole("button", { name: /add payment method/i }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
});
