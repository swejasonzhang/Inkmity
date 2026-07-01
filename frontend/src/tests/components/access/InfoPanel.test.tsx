import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";
import InfoPanel from "@/components/access/InfoPanel";

describe("InfoPanel", () => {
  test("signup + client shows the mission, client value props, and the client steps", () => {
    render(<InfoPanel show prefersReduced mode="signup" role="client" />);
    expect(screen.getByRole("heading", { name: /our mission/i })).toBeInTheDocument();
    expect(screen.getByText("Matched to your vision")).toBeInTheDocument();
    expect(screen.getByText(/How it works/i)).toBeInTheDocument();
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Get rewarded")).toBeInTheDocument();
  });

  test("signup + artist shows artist-focused value props and steps", () => {
    render(<InfoPanel show prefersReduced mode="signup" role="artist" />);
    expect(screen.getByText("Less admin, more art")).toBeInTheDocument();
    expect(screen.getByText("Cash out")).toBeInTheDocument();
    expect(screen.queryByText("Matched to your vision")).not.toBeInTheDocument();
  });

  test("login mode greets a returning visitor and omits the signup steps", () => {
    render(<InfoPanel show prefersReduced mode="login" role="client" />);
    expect(screen.getByRole("heading", { name: /we.ve missed you/i })).toBeInTheDocument();
    expect(screen.getByText("Search that understands style")).toBeInTheDocument();
    expect(screen.queryByText(/How it works/i)).not.toBeInTheDocument();
  });
});
