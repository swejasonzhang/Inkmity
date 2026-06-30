import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

const { default: Differentiators } = await import("@/components/landing/Differentiators");
const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

describe("Differentiators (landing)", () => {
  test("shows the platform's key differentiators a visitor reads", () => {
    render(<Differentiators textFadeUp={fade} />);

    // The headline claims that set Inkmity apart
    expect(screen.getByText("Booking, not just leads")).toBeInTheDocument();
    expect(screen.getByText("Paid only when it's done right")).toBeInTheDocument();
    expect(screen.getByText("No slot goes to waste")).toBeInTheDocument();
    expect(screen.getByText("Payments that protect everyone")).toBeInTheDocument();

    // ...with the supporting copy, not just the titles
    expect(screen.getByText(/runs the whole transaction on-platform/i)).toBeInTheDocument();
    expect(screen.getByText(/the waitlist auto-offers it to the next person/i)).toBeInTheDocument();
  });
});
