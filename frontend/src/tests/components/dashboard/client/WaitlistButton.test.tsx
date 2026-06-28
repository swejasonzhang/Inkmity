import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockGetMyWaitlist = jest.fn<() => Promise<any[]>>();
const mockJoinWaitlist = jest.fn<() => Promise<any>>();
const mockLeaveWaitlist = jest.fn<() => Promise<any>>();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

const mockGetToken = jest.fn(async () => "token");

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

jest.unstable_mockModule("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.unstable_mockModule("@/api", () => ({
  getMyWaitlist: mockGetMyWaitlist,
  joinWaitlist: mockJoinWaitlist,
  leaveWaitlist: mockLeaveWaitlist,
}));

const { default: WaitlistButton } = await import(
  "@/components/dashboard/client/WaitlistButton"
);

describe("WaitlistButton", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test("renders join state when not on the waitlist", async () => {
    mockGetMyWaitlist.mockResolvedValue([]);
    render(<WaitlistButton artistId="a1" />);
    expect(await screen.findByRole("button", { name: /join waitlist/i })).toBeInTheDocument();
  });

  test("renders leave state when already on the waitlist", async () => {
    mockGetMyWaitlist.mockResolvedValue([
      { _id: "w1", artistId: "a1", status: "active" },
    ]);
    render(<WaitlistButton artistId="a1" />);
    expect(await screen.findByRole("button", { name: /leave waitlist/i })).toBeInTheDocument();
  });

  test("joins the waitlist and shows success toast", async () => {
    mockGetMyWaitlist.mockResolvedValue([]);
    mockJoinWaitlist.mockResolvedValue({ _id: "w2", artistId: "a1", status: "active" });
    const user = userEvent.setup();
    render(<WaitlistButton artistId="a1" />);
    const btn = await screen.findByRole("button", { name: /join waitlist/i });
    await user.click(btn);
    await waitFor(() =>
      expect(mockJoinWaitlist).toHaveBeenCalledWith({ artistId: "a1" }, "token")
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /leave waitlist/i })).toBeInTheDocument()
    );
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  test("leaves the waitlist on click", async () => {
    mockGetMyWaitlist.mockResolvedValue([
      { _id: "w1", artistId: "a1", status: "notified" },
    ]);
    mockLeaveWaitlist.mockResolvedValue({});
    const user = userEvent.setup();
    render(<WaitlistButton artistId="a1" />);
    const btn = await screen.findByRole("button", { name: /leave waitlist/i });
    await user.click(btn);
    await waitFor(() => expect(mockLeaveWaitlist).toHaveBeenCalledWith("w1", "token"));
  });

  test("shows an error toast when joining fails", async () => {
    mockGetMyWaitlist.mockResolvedValue([]);
    mockJoinWaitlist.mockRejectedValue(new Error("full"));
    const user = userEvent.setup();
    render(<WaitlistButton artistId="a1" />);
    await user.click(await screen.findByRole("button", { name: /join waitlist/i }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("full", expect.anything()));
  });
});
