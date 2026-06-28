import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, act, waitFor } from "@/tests/setup/test-utils";

const useRole = jest.fn<() => { role: string; isLoaded: boolean }>(() => ({
  role: "client",
  isLoaded: true,
}));
const useTheme = jest.fn<() => { theme: string }>(() => ({ theme: "dark" }));

jest.unstable_mockModule("@/hooks/useRole", () => ({ useRole }));
jest.unstable_mockModule("@/hooks/useTheme", () => ({ useTheme }));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/dashboard/artist/ArtistProfile", () => ({
  default: () => <div data-testid="artist-profile" />,
}));
jest.unstable_mockModule("@/components/dashboard/client/ClientProfile", () => ({
  default: () => <div data-testid="client-profile" />,
}));

const { default: Profile } = await import("@/pages/Profile");

describe("Profile page", () => {
  beforeEach(() => {
    useRole.mockReturnValue({ role: "client", isLoaded: true });
    useTheme.mockReturnValue({ theme: "dark" });
  });

  test("renders header-only shell while role is loading", async () => {
    useRole.mockReturnValue({ role: "client", isLoaded: false });
    await act(async () => {
      render(<Profile />);
    });
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.queryByTestId("client-profile")).not.toBeInTheDocument();
  });

  test("renders the client profile for client role", async () => {
    await act(async () => {
      render(<Profile />);
    });
    await waitFor(() =>
      expect(screen.getByTestId("client-profile")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("artist-profile")).not.toBeInTheDocument();
  });

  test("renders the artist profile for artist role", async () => {
    useRole.mockReturnValue({ role: "artist", isLoaded: true });
    await act(async () => {
      render(<Profile />);
    });
    await waitFor(() =>
      expect(screen.getByTestId("artist-profile")).toBeInTheDocument()
    );
  });
});
