import { describe, test, expect } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";

const { default: ChatBot } = await import("@/components/dashboard/shared/ChatBot");

describe("ChatBot", () => {
  test("should render chat bot", () => {
    const { container } = render(<ChatBot />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should display assistant title", () => {
    render(<ChatBot />);
    expect(screen.getByText(/Assistant/i)).toBeInTheDocument();
  });

  test("should display coming soon message", () => {
    render(<ChatBot />);
    expect(screen.getByText(/Coming soon/i)).toBeInTheDocument();
  });

  test("should display locked feature message", () => {
    render(<ChatBot />);
    expect(screen.getByText(/This feature is being polished/i)).toBeInTheDocument();
  });
});
