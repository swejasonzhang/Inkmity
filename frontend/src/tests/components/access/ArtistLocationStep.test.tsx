import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

jest.unstable_mockModule("@/components/studio/StudioLocationPicker", () => ({
  default: ({ value, onChange }: any) => (
    <button
      data-testid="picker"
      onClick={() =>
        onChange({ name: "Shop X", address: "1 Main St", city: "NYC", lat: 1, lng: 2 })
      }
    >
      picker:{value.name || "none"}
    </button>
  ),
}));

const { default: ArtistLocationStep } = await import(
  "@/components/access/ArtistLocationStep"
);

describe("ArtistLocationStep", () => {
  test("renders the heading and embedded picker with the current shop", () => {
    render(
      <ArtistLocationStep artist={{ shop: "Existing Shop" }} onChange={jest.fn()} />
    );
    expect(screen.getByText("Shop & Location")).toBeInTheDocument();
    expect(screen.getByTestId("picker")).toHaveTextContent("picker:Existing Shop");
  });

  test("maps picker selection onto shop and shopAddress change events", async () => {
    const onChange = jest.fn();
    render(<ArtistLocationStep artist={{}} onChange={onChange} />);
    screen.getByTestId("picker").click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { name: "shop", value: "Shop X" } })
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { name: "shopAddress", value: "1 Main St" } })
    );
  });
});
