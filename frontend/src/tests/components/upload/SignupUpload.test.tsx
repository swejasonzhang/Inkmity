import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";
import SignupUpload from "@/components/upload/SignupUpload";

describe("SignupUpload", () => {
  test("shows the label and reflects images already uploaded", () => {
    render(
      <SignupUpload
        label="Showcase your top 4 pieces"
        kind="artist_portfolio"
        value={["a.jpg", "b.jpg"]}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText("Showcase your top 4 pieces")).toBeInTheDocument();
    expect(screen.getByText(/Uploaded 2/i)).toBeInTheDocument();
  });

  test("shows nothing uploaded yet for a fresh field", () => {
    render(
      <SignupUpload label="Add references" kind="client_ref" value={[]} onChange={jest.fn()} />
    );
    expect(screen.getByText("Add references")).toBeInTheDocument();
    expect(screen.getByText(/Uploaded 0/i)).toBeInTheDocument();
  });
});
