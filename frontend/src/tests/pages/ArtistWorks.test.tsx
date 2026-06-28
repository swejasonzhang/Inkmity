import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import React from "react";
import { render, screen, act, waitFor, fireEvent } from "@/tests/setup/test-utils";

const navigate = jest.fn();
let routerState: any = null;
const useUser = jest.fn<() => { isSignedIn: boolean }>(() => ({ isSignedIn: true }));
const usePageMeta = jest.fn();
const fetchArtistByHandle = jest.fn<() => Promise<any>>();
const fetchArtistById = jest.fn<() => Promise<any>>();

jest.unstable_mockModule("react-router-dom", () => ({
  useParams: () => ({ handle: "ann" }),
  useLocation: () => ({ state: routerState }),
  useNavigate: () => navigate,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.unstable_mockModule("@clerk/clerk-react", () => ({ useUser }));
jest.unstable_mockModule("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "dark" }),
}));
jest.unstable_mockModule("@/hooks/usePageMeta", () => ({ usePageMeta }));
jest.unstable_mockModule("@/lib/jsonLd", () => ({ jsonLdSafe: (x: any) => JSON.stringify(x) }));
jest.unstable_mockModule("@/api", () => ({ fetchArtistByHandle, fetchArtistById }));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/dashboard/client/ArtistPortfolio", () => ({
  default: () => <div data-testid="artist-portfolio" />,
}));
jest.unstable_mockModule("@/components/dashboard/client/ArtistBooking", () => ({
  default: () => <div data-testid="artist-booking" />,
}));
jest.unstable_mockModule("@/components/dashboard/client/ArtistReviews", () => ({
  default: () => <div data-testid="artist-reviews" />,
}));
jest.unstable_mockModule("@/components/dashboard/shared/VerifiedBadge", () => ({
  default: () => <span data-testid="verified" />,
}));

const { default: ArtistWorks } = await import("@/pages/ArtistWorks");

describe("ArtistWorks page", () => {
  beforeEach(() => {
    routerState = null;
    navigate.mockReset();
    useUser.mockReturnValue({ isSignedIn: true });
    fetchArtistByHandle.mockReset();
    fetchArtistById.mockReset();
  });

  test("renders the artist header and portfolio tab after fetch", async () => {
    fetchArtistByHandle.mockResolvedValue({
      _id: "a1",
      handle: "ann",
      username: "ann",
      rating: 4.7,
      reviewsCount: 12,
      location: "NYC",
      styles: ["traditional"],
      verified: true,
    });
    await act(async () => {
      render(<ArtistWorks />);
    });
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Ann" })).toBeInTheDocument()
    );
    expect(screen.getByText("@ann")).toBeInTheDocument();
    expect(screen.getByTestId("artist-portfolio")).toBeInTheDocument();
    expect(usePageMeta).toHaveBeenCalled();
  });

  test("shows not-found when fetch yields no artist", async () => {
    fetchArtistByHandle.mockResolvedValue(null);
    await act(async () => {
      render(<ArtistWorks />);
    });
    await waitFor(() =>
      expect(screen.getByText("Artist not found.")).toBeInTheDocument()
    );
  });

  test("switches to reviews tab", async () => {
    fetchArtistByHandle.mockResolvedValue({ _id: "a1", handle: "ann", username: "ann" });
    await act(async () => {
      render(<ArtistWorks />);
    });
    await waitFor(() => expect(screen.getByText("Reviews")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("Reviews"));
    });
    expect(screen.getByTestId("artist-reviews")).toBeInTheDocument();
  });

  test("signed-out users see the sign-in gate on the booking tab", async () => {
    useUser.mockReturnValue({ isSignedIn: false });
    fetchArtistByHandle.mockResolvedValue({ _id: "a1", handle: "ann", username: "ann" });
    await act(async () => {
      render(<ArtistWorks />);
    });
    await waitFor(() =>
      expect(screen.getByText("Booking & Message")).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Booking & Message"));
    });
    expect(screen.getByText("Sign in to book or message")).toBeInTheDocument();
    expect(screen.queryByTestId("artist-booking")).not.toBeInTheDocument();
  });

  test("back button navigates to history", async () => {
    fetchArtistByHandle.mockResolvedValue({ _id: "a1", handle: "ann", username: "ann" });
    await act(async () => {
      render(<ArtistWorks />);
    });
    await waitFor(() => expect(screen.getByText("Back")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("Back"));
    });
    expect(navigate).toHaveBeenCalledWith(-1);
  });
});
