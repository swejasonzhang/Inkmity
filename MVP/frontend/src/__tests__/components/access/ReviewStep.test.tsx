import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";

const { default: ReviewStep } = await import("@/components/access/ReviewStep");

describe("ReviewStep", () => {
  const defaultShared = {
    username: "testuser",
    email: "test@example.com",
    password: "password123",
  };

  const defaultClient = {
    budgetMin: "100",
    budgetMax: "500",
    location: "New York, NY",
    placement: "Forearm",
    size: "medium",
    style: "American Traditional",
    availability: "7d",
  };

  const defaultArtist = {
    location: "Los Angeles, CA",
    years: "5",
    baseRate: "150",
    bookingPreference: "open" as const,
    travelFrequency: "sometimes" as const,
    styles: ["American Traditional", "Realism"],
  };

  test("should render review step for client", () => {
    render(
      <ReviewStep
        role="client"
        shared={defaultShared}
        client={defaultClient}
        artist={defaultArtist}
        bio=""
        onBioChange={jest.fn()}
      />
    );
    expect(screen.getByText(/Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Client Details/i)).toBeInTheDocument();
  });

  test("should render review step for artist", () => {
    render(
      <ReviewStep
        role="artist"
        shared={defaultShared}
        client={defaultClient}
        artist={defaultArtist}
        bio=""
        onBioChange={jest.fn()}
      />
    );
    expect(screen.getByText(/Artist Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Styles/i)).toBeInTheDocument();
  });

  test("should display account information", () => {
    render(
      <ReviewStep
        role="client"
        shared={defaultShared}
        client={defaultClient}
        artist={defaultArtist}
        bio=""
        onBioChange={jest.fn()}
      />
    );
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });
});
