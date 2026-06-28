import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";
import type { LegalDocument } from "@/api";

const mockGetDocument = jest.fn<() => Promise<LegalDocument>>();
const mockSignDocument = jest.fn<() => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();
const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.unstable_mockModule("@/api", () => ({
  getDocument: mockGetDocument,
  signDocument: mockSignDocument,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: toastSuccess, error: toastError },
  ToastContainer: () => null,
}));

const { default: DocumentSignModal } = await import("@/components/dashboard/shared/DocumentSignModal");

const doc: LegalDocument = {
  docType: "artist_agreement",
  version: "2",
  title: "Artist Agreement",
  body: "These are the terms you agree to.",
  roles: ["artist"],
  contentHash: "hash",
};

const props = {
  open: true,
  docType: "artist_agreement",
  signerRole: "artist" as const,
  bookingId: "b1",
  onSigned: jest.fn(),
  onClose: jest.fn(),
};

describe("DocumentSignModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockGetDocument.mockResolvedValue(doc);
    mockSignDocument.mockResolvedValue({});
  });

  test("loads and displays the document when opened", async () => {
    render(<DocumentSignModal {...props} />);
    await waitFor(() => expect(screen.getByText("Artist Agreement")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText("These are the terms you agree to.")).toBeInTheDocument();
    expect(screen.getByText(/version 2/i)).toBeInTheDocument();
  });

  test("disables sign button until a name is entered", async () => {
    render(<DocumentSignModal {...props} />);
    await waitFor(() => expect(screen.getByText("Artist Agreement")).toBeInTheDocument(), { timeout: 3000 });
    const signBtn = screen.getByRole("button", { name: /Sign & agree/i });
    expect(signBtn).toBeDisabled();
  });

  test("signs the document and calls onSigned", async () => {
    const user = userEvent.setup();
    const onSigned = jest.fn();
    render(<DocumentSignModal {...props} onSigned={onSigned} />);
    await waitFor(() => expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument(), { timeout: 3000 });

    await user.type(screen.getByPlaceholderText("Full name"), "  Jane Ink  ");
    await user.click(screen.getByRole("button", { name: /Sign & agree/i }));

    await waitFor(() =>
      expect(mockSignDocument).toHaveBeenCalledWith(
        "artist_agreement",
        { signatureName: "Jane Ink", signerRole: "artist", bookingId: "b1", studioId: undefined },
        "mock-token"
      )
    );
    expect(toastSuccess).toHaveBeenCalled();
    expect(onSigned).toHaveBeenCalled();
  });

  test("shows error toast when load fails", async () => {
    mockGetDocument.mockRejectedValue(new Error("load boom"));
    render(<DocumentSignModal {...props} />);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("load boom", { theme: "dark" }), { timeout: 3000 });
  });

  test("shows error toast when signing fails", async () => {
    const user = userEvent.setup();
    mockSignDocument.mockRejectedValue(new Error("sign boom"));
    render(<DocumentSignModal {...props} />);
    await waitFor(() => expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument(), { timeout: 3000 });

    await user.type(screen.getByPlaceholderText("Full name"), "Jane");
    await user.click(screen.getByRole("button", { name: /Sign & agree/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("sign boom", { theme: "dark" }));
  });

  test("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<DocumentSignModal {...props} onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument(), { timeout: 3000 });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});
