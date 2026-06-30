import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";

const { default: BottomCTA } = await import("@/components/landing/BottomCTA");
const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

describe("BottomCTA (landing)", () => {
  test("shows the closing pitch and routes the CTA to signup", () => {
    render(<BottomCTA textFadeUp={fade} />);

    expect(
      screen.getByRole("heading", { name: /ready to make booking painless\?/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Join Inkmity today/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create your inkmity account/i })
    ).toHaveAttribute("href", "/signup");
  });
});
