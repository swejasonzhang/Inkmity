import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@/tests/setup/test-utils";

const mockGetToken = jest.fn<() => Promise<string>>();
const mockGetIntakeForm = jest.fn<(...a: any[]) => Promise<any>>();
const mockSubmitIntakeForm = jest.fn<(...a: any[]) => Promise<any>>();
const mockDeleteIntakeForm = jest.fn<(...a: any[]) => Promise<any>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.unstable_mockModule("@/api", () => ({
  getIntakeForm: mockGetIntakeForm,
  submitIntakeForm: mockSubmitIntakeForm,
  deleteIntakeForm: mockDeleteIntakeForm,
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const { default: IntakeFormPanel } = await import(
  "@/components/dashboard/client/IntakeFormPanel"
);

const REQUIRED = [
  /i confirm i am 18/i,
  /accurate and complete/i,
  /follow the aftercare/i,
  /deposit policy/i,
  /cancellation policy/i,
];

describe("IntakeFormPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("tok");
    mockGetIntakeForm.mockResolvedValue(null);
    mockSubmitIntakeForm.mockResolvedValue({ submittedAt: "2026-01-01T00:00:00Z" });
  });

  test("renders nothing for non-clients", async () => {
    const { container } = render(<IntakeFormPanel bookingId="bk1" isClient={false} />);
    await waitFor(() => expect(mockGetIntakeForm).not.toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  test("shows the complete-intake CTA when none exists", async () => {
    render(<IntakeFormPanel bookingId="bk1" isClient />);
    expect(await screen.findByRole("button", { name: /complete intake form/i })).toBeInTheDocument();
    expect(mockGetIntakeForm).toHaveBeenCalledWith("bk1", "tok");
  });

  test("shows submitted state when an intake already exists", async () => {
    mockGetIntakeForm.mockResolvedValue({
      submittedAt: "2026-01-01T00:00:00Z",
      consent: { ageVerification: true },
    });
    render(<IntakeFormPanel bookingId="bk1" isClient />);
    expect(await screen.findByRole("button", { name: /intake form submitted/i })).toBeInTheDocument();
  });

  test("gates submit on required consent, then submits the payload", async () => {
    render(<IntakeFormPanel bookingId="bk1" isClient />);
    fireEvent.click(await screen.findByRole("button", { name: /complete intake form/i }));

    expect(await screen.findByText(/pre-appointment intake/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /submit intake/i });
    expect(submitBtn).toBeDisabled();
    fireEvent.click(submitBtn);
    expect(mockSubmitIntakeForm).not.toHaveBeenCalled();

    for (const label of REQUIRED) {
      fireEvent.click(screen.getByRole("checkbox", { name: label }));
    }

    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => expect(mockSubmitIntakeForm).toHaveBeenCalledTimes(1));
    const [bookingId, payload, token] = mockSubmitIntakeForm.mock.calls[0] as any[];
    expect(bookingId).toBe("bk1");
    expect(token).toBe("tok");
    expect(payload.consent).toMatchObject({
      ageVerification: true,
      healthDisclosure: true,
      aftercareInstructions: true,
      depositPolicy: true,
      cancellationPolicy: true,
    });
  });
});
