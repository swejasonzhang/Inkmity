import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockCreateReport = jest.fn<() => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();
const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.unstable_mockModule("@/api", () => ({
  createReport: mockCreateReport,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: toastSuccess, error: toastError },
  ToastContainer: () => null,
}));

const { default: ReportModal } = await import("@/components/dashboard/shared/ReportModal");

const props = {
  open: true,
  targetType: "artist" as const,
  targetRef: "artist-1",
  targetOwnerClerkId: "owner-1",
  onClose: jest.fn(),
};

describe("ReportModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockCreateReport.mockResolvedValue({});
  });

  test("renders nothing when closed", () => {
    render(<ReportModal {...props} open={false} />);
    expect(screen.queryByText("Report this")).not.toBeInTheDocument();
  });

  test("renders the modal with all reasons when open", () => {
    render(<ReportModal {...props} />);
    expect(screen.getByText("Report this")).toBeInTheDocument();
    expect(screen.getByText("Inappropriate or explicit")).toBeInTheDocument();
    expect(screen.getByText("Spam or misleading")).toBeInTheDocument();
    expect(screen.getByText("Something else")).toBeInTheDocument();
  });

  test("calls onClose when Cancel is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<ReportModal {...props} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when the close (X) button is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<ReportModal {...props} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("submits the selected reason and details, then shows success toast", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<ReportModal {...props} onClose={onClose} />);

    await user.click(screen.getByLabelText("Spam or misleading"));
    await user.type(screen.getByPlaceholderText(/Add any details/i), "  this is spam  ");
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() =>
      expect(mockCreateReport).toHaveBeenCalledWith(
        {
          targetType: "artist",
          targetRef: "artist-1",
          targetOwnerClerkId: "owner-1",
          reason: "spam",
          details: "this is spam",
        },
        "mock-token"
      )
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  test("shows an error toast when submission fails", async () => {
    const user = userEvent.setup();
    mockCreateReport.mockRejectedValue({ body: { message: "Server says no" } });
    render(<ReportModal {...props} />);

    await user.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Server says no"));
  });
});
