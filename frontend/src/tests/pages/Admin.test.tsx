import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, act, waitFor, fireEvent } from "@/tests/setup/test-utils";

const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue("tok");
const getMe = jest.fn<() => Promise<any>>();
const getNoShowDisputes = jest.fn<() => Promise<any>>();
const listReports = jest.fn<() => Promise<any>>();
const resolveArtistNoShow = jest.fn<() => Promise<any>>();
const updateReportStatus = jest.fn<() => Promise<any>>();
const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken }),
}));
jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: toastSuccess, error: toastError },
  ToastContainer: () => <div data-testid="toast" />,
}));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/api", () => ({
  getMe,
  getNoShowDisputes,
  listReports,
  resolveArtistNoShow,
  updateReportStatus,
}));

const { default: Admin } = await import("@/pages/Admin");

describe("Admin page", () => {
  beforeEach(() => {
    getMe.mockReset();
    getNoShowDisputes.mockReset();
    listReports.mockReset();
    resolveArtistNoShow.mockReset().mockResolvedValue({});
    updateReportStatus.mockReset().mockResolvedValue({});
    toastSuccess.mockReset();
    toastError.mockReset();
    getNoShowDisputes.mockResolvedValue({ items: [] });
    listReports.mockResolvedValue({ reports: [] });
  });

  test("shows access-denied for non-admin users", async () => {
    getMe.mockResolvedValue({ isAdmin: false });
    await act(async () => {
      render(<Admin />);
    });
    await waitFor(() =>
      expect(screen.getByText(/don't have access/i)).toBeInTheDocument()
    );
  });

  test("renders empty states for admins with no disputes or reports", async () => {
    getMe.mockResolvedValue({ isAdmin: true });
    await act(async () => {
      render(<Admin />);
    });
    await waitFor(() =>
      expect(screen.getByText("No open disputes.")).toBeInTheDocument()
    );
    expect(screen.getByText("No open reports.")).toBeInTheDocument();
  });

  test("renders disputes and resolves one with a refund", async () => {
    getMe.mockResolvedValue({ isAdmin: true });
    getNoShowDisputes.mockResolvedValue({
      items: [
        {
          _id: "d1",
          client: { username: "Ann" },
          artist: { username: "Bo" },
          artistNoShowStatus: "open",
          startAt: new Date("2026-01-01T10:00:00Z").toISOString(),
        },
      ],
    });
    await act(async () => {
      render(<Admin />);
    });
    await waitFor(() => expect(screen.getByText(/Ann vs Bo/)).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("Refund client"));
    });
    await waitFor(() =>
      expect(resolveArtistNoShow).toHaveBeenCalledWith("d1", true, "tok")
    );
    expect(toastSuccess).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText(/Ann vs Bo/)).not.toBeInTheDocument()
    );
  });

  test("renders reports and actions one", async () => {
    getMe.mockResolvedValue({ isAdmin: true });
    listReports.mockResolvedValue({
      reports: [
        {
          _id: "r1",
          targetType: "artwork",
          reason: "spam",
          targetRef: "https://x/img.png",
          createdAt: new Date("2026-01-02").toISOString(),
        },
      ],
    });
    await act(async () => {
      render(<Admin />);
    });
    await waitFor(() =>
      expect(screen.getByText(/artwork · spam/)).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Mark actioned"));
    });
    await waitFor(() =>
      expect(updateReportStatus).toHaveBeenCalledWith("r1", "actioned", "tok")
    );
  });

  test("treats a failed getMe as non-admin", async () => {
    getMe.mockRejectedValue(new Error("nope"));
    await act(async () => {
      render(<Admin />);
    });
    await waitFor(() =>
      expect(screen.getByText(/don't have access/i)).toBeInTheDocument()
    );
  });
});
