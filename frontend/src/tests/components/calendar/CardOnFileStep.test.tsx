import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockGetToken = jest.fn(async () => "token");
const mockCardSetup = jest.fn<() => Promise<any>>();
const mockBankSetup = jest.fn<() => Promise<any>>();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

const mockStripe = {
  confirmCardSetup: jest.fn<() => Promise<any>>(),
  collectBankAccountForSetup: jest.fn<() => Promise<any>>(),
  confirmUsBankAccountSetup: jest.fn<() => Promise<any>>(),
};
const mockElements = { getElement: jest.fn(() => ({})) };

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
  useUser: () => ({
    user: { fullName: "Jane Doe", primaryEmailAddress: { emailAddress: "j@x.com" } },
  }),
}));

jest.unstable_mockModule("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: any) => <div>{children}</div>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
}));

jest.unstable_mockModule("@/lib/stripe", () => ({
  stripePromise: Promise.resolve(null),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { error: mockToastError, success: mockToastSuccess },
}));

jest.unstable_mockModule("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.unstable_mockModule("@/api", () => ({
  createCardSetupIntent: mockCardSetup,
  createBankSetupIntent: mockBankSetup,
}));

const { default: CardOnFileStep } = await import(
  "@/components/calendar/CardOnFileStep"
);

const booking = { _id: "b1" } as any;

describe("CardOnFileStep", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test("renders the card tab by default with the card element", () => {
    render(
      <CardOnFileStep
        booking={booking}
        onSaved={jest.fn()}
        onCancel={jest.fn()}
        artistName="Ink Jane"
      />
    );
    expect(screen.getByText("Save a payment method")).toBeInTheDocument();
    expect(screen.getByText(/with Ink Jane/)).toBeInTheDocument();
    expect(screen.getByTestId("card-element")).toBeInTheDocument();
    expect(screen.getByText("Save card")).toBeInTheDocument();
  });

  test("calls onCancel when 'Not now' is clicked", async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    render(<CardOnFileStep booking={booking} onSaved={jest.fn()} onCancel={onCancel} />);
    await user.click(screen.getByText("Not now"));
    expect(onCancel).toHaveBeenCalled();
  });

  test("saves a card successfully and calls onSaved", async () => {
    mockCardSetup.mockResolvedValue({ clientSecret: "cs" });
    mockStripe.confirmCardSetup.mockResolvedValue({ error: null });
    const onSaved = jest.fn();
    const user = userEvent.setup();
    render(<CardOnFileStep booking={booking} onSaved={onSaved} onCancel={jest.fn()} />);
    await user.click(screen.getByText("Save card"));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  test("shows an error when card confirmation fails", async () => {
    mockCardSetup.mockResolvedValue({ clientSecret: "cs" });
    mockStripe.confirmCardSetup.mockResolvedValue({ error: { message: "declined" } });
    const user = userEvent.setup();
    render(<CardOnFileStep booking={booking} onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.click(screen.getByText("Save card"));
    await waitFor(() => expect(screen.getByText("declined")).toBeInTheDocument());
    expect(mockToastError).toHaveBeenCalledWith("declined");
  });

  test("switches to the bank tab and links a bank account", async () => {
    mockBankSetup.mockResolvedValue({ clientSecret: "cs" });
    mockStripe.collectBankAccountForSetup.mockResolvedValue({
      error: null,
      setupIntent: { status: "succeeded" },
    });
    const onSaved = jest.fn();
    const user = userEvent.setup();
    render(<CardOnFileStep booking={booking} onSaved={onSaved} onCancel={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: /Bank \(ACH\)/ }));
    expect(screen.getByText("Connect bank")).toBeInTheDocument();
    await user.click(screen.getByText("Connect bank"));
    await waitFor(() => expect(mockBankSetup).toHaveBeenCalled());
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  test("confirms the bank account when status requires confirmation", async () => {
    mockBankSetup.mockResolvedValue({ clientSecret: "cs" });
    mockStripe.collectBankAccountForSetup.mockResolvedValue({
      error: null,
      setupIntent: { status: "requires_confirmation" },
    });
    mockStripe.confirmUsBankAccountSetup.mockResolvedValue({ error: null });
    const onSaved = jest.fn();
    const user = userEvent.setup();
    render(<CardOnFileStep booking={booking} onSaved={onSaved} onCancel={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: /Bank \(ACH\)/ }));
    await user.click(screen.getByText("Connect bank"));
    await waitFor(() => expect(mockStripe.confirmUsBankAccountSetup).toHaveBeenCalled());
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  test("surfaces a bank collection error", async () => {
    mockBankSetup.mockResolvedValue({ clientSecret: "cs" });
    mockStripe.collectBankAccountForSetup.mockResolvedValue({
      error: { message: "bank failed" },
    });
    const user = userEvent.setup();
    render(<CardOnFileStep booking={booking} onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: /Bank \(ACH\)/ }));
    await user.click(screen.getByText("Connect bank"));
    await waitFor(() => expect(screen.getByText("bank failed")).toBeInTheDocument());
  });
});
