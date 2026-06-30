import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

const mockTextFadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const { default: Roadmap } = await import("@/components/landing/Roadmap");

describe("Roadmap", () => {
  test("renders the roadmap eyebrow and heading", () => {
    render(<Roadmap textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText(/Roadmap · in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Where Inkmity is headed/i)).toBeInTheDocument();
  });

  test("renders all nine roadmap cards", () => {
    render(<Roadmap textFadeUp={mockTextFadeUp} />);
    expect(screen.getByText("AI booking assistant")).toBeInTheDocument();
    expect(screen.getByText("Speaks your language")).toBeInTheDocument();
    expect(screen.getByText("Built to go global")).toBeInTheDocument();
    expect(screen.getByText("Your collection journey")).toBeInTheDocument();
    expect(screen.getByText("Aftercare that checks in")).toBeInTheDocument();
    expect(screen.getByText("Follow your artists")).toBeInTheDocument();
    expect(screen.getByText("Studios, fully wired")).toBeInTheDocument();
    expect(screen.getByText("Earned status & insight")).toBeInTheDocument();
    expect(screen.getByText(/And we're just getting started/i)).toBeInTheDocument();
  });

  test("marks every card as Soon", () => {
    render(<Roadmap textFadeUp={mockTextFadeUp} />);
    expect(screen.getAllByText("Soon")).toHaveLength(9);
  });

  test("applies the wc style override", () => {
    render(<Roadmap textFadeUp={mockTextFadeUp} wc={{ color: "rgb(10, 11, 12)" }} />);
    expect(screen.getByText(/Where Inkmity is headed/i)).toHaveStyle({
      color: "rgb(10, 11, 12)",
    });
  });
});
