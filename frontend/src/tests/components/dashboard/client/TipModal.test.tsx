import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockCreateTipCheckout = jest.fn<() => Promise<any>>();
const mockToastError = jest.fn();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: async () => "token" }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { error: mockToastError },
}));

jest.unstable_mockModule("@/hooks/useScrollLock", () => ({
  useScrollLock: jest.fn(),
}));

jest.unstable_mockModule("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.unstable_mockModule("@/api", () => ({
  createTipCheckout: mockCreateTipCheckout,
}));

const { default: TipModal } = await import("@/components/dashboard/client/TipModal");

describe("TipModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  test("renders nothing when closed", () => {
    const { container } = render(
      <TipModal open={false} bookingId="b1" onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  test("renders presets and the default tip amount", () => {
    render(<TipModal open bookingId="b1" artistName="Jane" onClose={jest.fn()} />);
    expect(screen.getByText("Tip Jane")).toBeInTheDocument();
    expect(screen.getByText("Tip $20.00")).toBeInTheDocument(); // default 2000c selected
  });

  test("calls onClose when cancel is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<TipModal open bookingId="b1" onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  test("uses a custom amount over the preset", async () => {
    const user = userEvent.setup();
    render(<TipModal open bookingId="b1" onClose={jest.fn()} />);
    const input = screen.getByPlaceholderText("Other");
    await user.type(input, "35");
    expect(screen.getByText("Tip $35.00")).toBeInTheDocument();
  });

  test("disables the tip button for amounts under $1", async () => {
    const user = userEvent.setup();
    render(<TipModal open bookingId="b1" onClose={jest.fn()} />);
    await user.type(screen.getByPlaceholderText("Other"), "0.5");
    expect(screen.getByText("Tip $0.50").closest("button")).toBeDisabled();
  });

  test("redirects to the Stripe url on successful checkout", async () => {
    mockCreateTipCheckout.mockResolvedValue({ url: "https://stripe.test/pay" });
    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: "" };
    const user = userEvent.setup();
    render(<TipModal open bookingId="b1" onClose={jest.fn()} />);
    await user.click(screen.getByText("Tip $20.00"));
    await waitFor(() => expect(window.location.href).toBe("https://stripe.test/pay"));
    (window as any).location = originalLocation;
  });

  test("shows an error toast when checkout returns no url", async () => {
    mockCreateTipCheckout.mockResolvedValue({});
    const user = userEvent.setup();
    render(<TipModal open bookingId="b1" onClose={jest.fn()} />);
    await user.click(screen.getByText("Tip $20.00"));
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  });
});
