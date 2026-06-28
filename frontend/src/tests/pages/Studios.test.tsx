import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, act, waitFor, fireEvent } from "@/tests/setup/test-utils";

const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue("tok");
const useUser = jest.fn(() => ({ user: { id: "u1" } }));
const useRole = jest.fn(() => ({ role: "artist" }));
const useMessaging = jest.fn(() => ({
  unreadState: { unreadMessagesTotal: 0, unreadByConversation: {} },
  pendingRequestIds: [],
  pendingRequestsCount: 0,
}));

const createStudio = jest.fn<() => Promise<any>>().mockResolvedValue({});
const getMyStudios = jest.fn<() => Promise<any>>();
const getMyStudioMemberships = jest.fn<() => Promise<any>>();
const respondToStudioInvite = jest.fn<() => Promise<any>>().mockResolvedValue({});
const getStudioConnectStatus = jest.fn<() => Promise<any>>().mockResolvedValue({ status: "none" });
const listStudioMembers = jest.fn<() => Promise<any>>().mockResolvedValue([]);
const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken }),
  useUser,
}));
jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: toastSuccess, error: toastError },
}));
jest.unstable_mockModule("@/hooks/useMessaging", () => ({ useMessaging }));
jest.unstable_mockModule("@/hooks/useRole", () => ({ useRole }));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/dashboard/shared/FloatingBar", () => ({
  default: () => <div data-testid="floating-bar" />,
}));
jest.unstable_mockModule("@/components/dashboard/shared/ChatWindow", () => ({
  default: () => <div data-testid="chat-window" />,
}));
jest.unstable_mockModule("@/components/dashboard/shared/DocumentSignModal", () => ({
  default: () => null,
}));
jest.unstable_mockModule("@/components/studio/StudioLocationPicker", () => ({
  default: () => <div data-testid="location-picker" />,
}));
jest.unstable_mockModule("@/api", () => ({
  API_URL: "http://localhost:3001",
  createStudio,
  getMyStudios,
  updateStudio: jest.fn(),
  listStudioMembers,
  inviteArtistToStudio: jest.fn(),
  updateStudioMember: jest.fn(),
  removeStudioMember: jest.fn(),
  getMyStudioMemberships,
  respondToStudioInvite,
  getStudioConnectStatus,
  startStudioConnectOnboarding: jest.fn(),
}));

const { default: Studios } = await import("@/pages/Studios");

describe("Studios page", () => {
  beforeEach(() => {
    getMyStudios.mockReset().mockResolvedValue([]);
    getMyStudioMemberships.mockReset().mockResolvedValue([]);
    createStudio.mockClear();
    respondToStudioInvite.mockClear();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  test("renders the empty studios state for an owner with none", async () => {
    await act(async () => {
      render(<Studios />);
    });
    await waitFor(() =>
      expect(screen.getByText("Studios")).toBeInTheDocument()
    );
    expect(screen.getByText(/don't own a studio yet/i)).toBeInTheDocument();
    expect(
      screen.getByText("Select or create a studio to manage it.")
    ).toBeInTheDocument();
  });

  test("renders studio invitations and active memberships", async () => {
    getMyStudioMemberships.mockResolvedValue([
      { _id: "m1", status: "invited", studio: { name: "Ink Co" }, effectiveCommissionPct: 0.2 },
      { _id: "m2", status: "active", studio: { name: "Work Place" }, effectiveCommissionPct: 0.15 },
    ]);
    await act(async () => {
      render(<Studios />);
    });
    await waitFor(() =>
      expect(screen.getByText("Studio invitations")).toBeInTheDocument()
    );
    expect(screen.getByText(/Ink Co invited you/)).toBeInTheDocument();
    expect(screen.getByText("Studios you work at")).toBeInTheDocument();
    expect(screen.getByText("Work Place")).toBeInTheDocument();
  });

  test("accepting an invitation calls the API and reloads", async () => {
    getMyStudioMemberships.mockResolvedValue([
      { _id: "m1", status: "invited", studio: { name: "Ink Co" } },
    ]);
    await act(async () => {
      render(<Studios />);
    });
    await waitFor(() => expect(screen.getByText("Accept")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("Accept"));
    });
    await waitFor(() =>
      expect(respondToStudioInvite).toHaveBeenCalledWith("m1", "accept", "tok")
    );
  });

  test("renders owned studios and selecting one mounts the panel", async () => {
    getMyStudios.mockResolvedValue([
      { _id: "s1", name: "My Studio", verificationStatus: "verified" },
    ]);
    await act(async () => {
      render(<Studios />);
    });
    await waitFor(() => expect(screen.getByText("My Studio")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Settings")).toBeInTheDocument());
    expect(screen.getByText("Artists")).toBeInTheDocument();
    await waitFor(() => expect(listStudioMembers).toHaveBeenCalled());
  });

  test("creating a studio via the add form calls the API", async () => {
    await act(async () => {
      render(<Studios />);
    });
    const heading = await screen.findByText("Your studios");
    const sectionHeader = heading.parentElement!;
    const toggle = sectionHeader.querySelector("button")!;
    await act(async () => {
      fireEvent.click(toggle);
    });
    const input = await screen.findByPlaceholderText("Studio name");
    await act(async () => {
      fireEvent.change(input, { target: { value: "New Studio" } });
      fireEvent.click(screen.getByText("Add"));
    });
    await waitFor(() =>
      expect(createStudio).toHaveBeenCalledWith({ name: "New Studio" }, "tok")
    );
  });
});
