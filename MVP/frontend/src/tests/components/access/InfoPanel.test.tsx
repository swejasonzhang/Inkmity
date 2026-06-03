import { describe, test, expect } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import InfoPanel from "@/components/access/InfoPanel";

describe("InfoPanel", () => {
  test("should render info panel", async () => {
    const { container } = render(<InfoPanel show={true} prefersReduced={false} />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  test("should display mission message for signup", async () => {
    render(<InfoPanel show={true} prefersReduced={false} mode="signup" />);
    await waitFor(() => {
      expect(screen.getByText(/Our Mission/i)).toBeInTheDocument();
    });
  });

  test("should display welcome message for login", async () => {
    render(<InfoPanel show={true} prefersReduced={false} mode="login" />);
    await waitFor(() => {
      expect(screen.getByText(/missed you/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("should render value props", async () => {
    render(<InfoPanel show={true} prefersReduced={false} mode="signup" />);
    await waitFor(() => {
      expect(screen.getByText(/Matched to your vision/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
