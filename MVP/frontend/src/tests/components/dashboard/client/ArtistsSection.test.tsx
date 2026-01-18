import { jest, describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

jest.unstable_mockModule("@/components/dashboard/client/ArtistCard", () => ({
  default: jest.fn(() => <div data-testid="artist-card">Artist Card</div>),
}));

const { default: ArtistsSection } = await import("@/components/dashboard/client/ArtistsSection");

describe("ArtistsSection", () => {
  test("should render artists section", () => {
    const { container } = render(
      <ArtistsSection
        artists={[]}
        loading={false}
        showArtists={true}
        onSelectArtist={jest.fn()}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
