import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import React from "react";
import { render, screen, act, waitFor, fireEvent } from "@/tests/setup/test-utils";

const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue("tok");
const useUser = jest.fn<() => { isSignedIn: boolean }>(() => ({ isSignedIn: true }));
const fetchPopularArtworks = jest.fn<() => Promise<any>>();
const getTrendingIdeas = jest.fn<() => Promise<any>>();
const toggleArtworkLike = jest.fn<() => Promise<any>>();
const toastInfo = jest.fn();
const toastError = jest.fn();
const navigate = jest.fn();

jest.unstable_mockModule("framer-motion", () => ({
  motion: new Proxy(
    {},
    { get: () => ({ children, ...rest }: any) => React.createElement("div", rest, children) }
  ),
}));
jest.unstable_mockModule("react-router-dom", () => ({
  useNavigate: () => navigate,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken }),
  useUser,
}));
jest.unstable_mockModule("react-toastify", () => ({
  toast: { info: toastInfo, error: toastError },
}));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/ui/LazyReveal", () => ({
  default: ({ loading, skeleton, children }: any) => (loading ? skeleton : children),
}));
jest.unstable_mockModule("@/components/dashboard/shared/VerifiedBadge", () => ({
  default: () => <span data-testid="verified" />,
}));
jest.unstable_mockModule("@/components/dashboard/shared/ReportModal", () => ({
  default: ({ open }: any) => (open ? <div data-testid="report-modal" /> : null),
}));
jest.unstable_mockModule("@/api", () => ({
  fetchPopularArtworks,
  getTrendingIdeas,
  toggleArtworkLike,
}));

const { default: Gallery } = await import("@/pages/Gallery");

const artwork = (over: Record<string, any> = {}) => ({
  artistClerkId: "c1",
  url: "https://x/a.png",
  username: "ann",
  handle: "ann",
  likes: 3,
  likedByMe: false,
  styles: ["traditional"],
  idea: "koi",
  ...over,
});

describe("Gallery page", () => {
  beforeEach(() => {
    useUser.mockReturnValue({ isSignedIn: true });
    fetchPopularArtworks.mockReset().mockResolvedValue({ items: [] });
    getTrendingIdeas.mockReset().mockResolvedValue({ items: [] });
    toggleArtworkLike.mockReset();
    toastInfo.mockReset();
    navigate.mockReset();
  });

  test("renders heading and empty state when no artwork", async () => {
    await act(async () => {
      render(<Gallery />);
    });
    expect(screen.getByRole("heading", { name: "Explore" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("No artwork yet")).toBeInTheDocument()
    );
  });

  test("renders artwork tiles and likes a piece", async () => {
    fetchPopularArtworks.mockResolvedValue({ items: [artwork()] });
    toggleArtworkLike.mockResolvedValue({ liked: true, likes: 4 });
    await act(async () => {
      render(<Gallery />);
    });
    await waitFor(() =>
      expect(screen.getByLabelText("View ann's portfolio")).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Like this piece"));
    });
    await waitFor(() => expect(toggleArtworkLike).toHaveBeenCalled());
  });

  test("prompts signed-out users to sign in before liking", async () => {
    useUser.mockReturnValue({ isSignedIn: false });
    fetchPopularArtworks.mockResolvedValue({ items: [artwork()] });
    await act(async () => {
      render(<Gallery />);
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Like this piece")).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Like this piece"));
    });
    expect(toastInfo).toHaveBeenCalledWith(
      "Sign in to save favorites.",
      expect.anything()
    );
    expect(toggleArtworkLike).not.toHaveBeenCalled();
  });

  test("filters items via the search box", async () => {
    fetchPopularArtworks.mockResolvedValue({
      items: [artwork({ idea: "dragon", url: "https://x/d.png" }), artwork({ idea: "rose", url: "https://x/r.png", username: "bob", handle: "bob" })],
    });
    await act(async () => {
      render(<Gallery />);
    });
    await waitFor(() =>
      expect(screen.getByLabelText("View ann's portfolio")).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Search ideas…"), {
        target: { value: "dragon" },
      });
    });
    expect(screen.getByLabelText("View ann's portfolio")).toBeInTheDocument();
    expect(screen.queryByLabelText("View bob's portfolio")).not.toBeInTheDocument();
  });

  test("switches to the AI inspiration tab", async () => {
    await act(async () => {
      render(<Gallery />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("AI Inspiration"));
    });
    expect(
      screen.getByText("AI inspiration is coming soon")
    ).toBeInTheDocument();
  });
});
