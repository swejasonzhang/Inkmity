import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, act, waitFor, fireEvent } from "@/tests/setup/test-utils";

const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue("tok");
const useRole = jest.fn<() => { role: string; isLoaded: boolean }>(() => ({
  role: "artist",
  isLoaded: true,
}));
const useTheme = jest.fn<() => { theme: string }>(() => ({ theme: "dark" }));
const getMe = jest.fn<() => Promise<any>>();
const updateMyPortfolio = jest.fn<() => Promise<any>>().mockResolvedValue({});
const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken }),
}));
jest.unstable_mockModule("@/hooks/useRole", () => ({ useRole }));
jest.unstable_mockModule("@/hooks/useTheme", () => ({ useTheme }));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/ui/spinner", () => ({
  Spinner: () => <span data-testid="spinner" />,
}));
jest.unstable_mockModule("@/components/ui/LazyReveal", () => ({
  default: ({ loading, skeleton, children }: any) => (loading ? skeleton : children),
}));
jest.unstable_mockModule("react-toastify", () => ({
  toast: { success: toastSuccess, error: toastError, info: jest.fn() },
  ToastContainer: () => <div data-testid="toast" />,
}));
jest.unstable_mockModule("@/api", () => ({ getMe, updateMyPortfolio }));
jest.unstable_mockModule("@/lib/cloudinary", () => ({
  getSignedUpload: jest.fn(),
  uploadToCloudinary: jest.fn(),
}));

const { default: Portfolio } = await import("@/pages/Portfolio");

describe("Portfolio page", () => {
  beforeEach(() => {
    useRole.mockReturnValue({ role: "artist", isLoaded: true });
    getMe.mockReset();
    updateMyPortfolio.mockClear();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  test("shows non-artist empty state for client accounts", async () => {
    useRole.mockReturnValue({ role: "client", isLoaded: true });
    await act(async () => {
      render(<Portfolio />);
    });
    await waitFor(() =>
      expect(
        screen.getByText("Portfolios are for artist accounts")
      ).toBeInTheDocument()
    );
  });

  test("shows empty state when an artist has no images", async () => {
    getMe.mockResolvedValue({ portfolioImages: [], portfolioMeta: [] });
    await act(async () => {
      render(<Portfolio />);
    });
    await waitFor(() => expect(screen.getByText("No work yet")).toBeInTheDocument());
  });

  test("renders an artist's existing portfolio images with cover badge", async () => {
    getMe.mockResolvedValue({
      portfolioImages: ["https://x/a.png", "https://x/b.png"],
      portfolioMeta: [{ url: "https://x/a.png", idea: "koi sleeve" }],
    });
    await act(async () => {
      render(<Portfolio />);
    });
    await waitFor(() =>
      expect(screen.getByAltText("Portfolio piece 1")).toBeInTheDocument()
    );
    expect(screen.getByText("Cover")).toBeInTheDocument();
    expect(screen.getByDisplayValue("koi sleeve")).toBeInTheDocument();
  });

  test("removing an image marks the portfolio dirty and saves", async () => {
    getMe.mockResolvedValue({
      portfolioImages: ["https://x/a.png", "https://x/b.png"],
      portfolioMeta: [],
    });
    await act(async () => {
      render(<Portfolio />);
    });
    await waitFor(() =>
      expect(screen.getByAltText("Portfolio piece 1")).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getAllByTitle("Remove")[0]);
    });
    expect(screen.queryByAltText("Portfolio piece 2")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Save changes"));
    });
    await waitFor(() => expect(updateMyPortfolio).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith("Portfolio saved.");
  });
});
