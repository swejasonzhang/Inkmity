import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const { default: Pagination } = await import("@/components/dashboard/shared/Pagination");

describe("Pagination", () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPrev: jest.fn(),
    onNext: jest.fn(),
  };

  test("should render pagination controls", () => {
    render(<Pagination {...defaultProps} />);
    const navs = screen.getAllByRole("navigation");
    expect(navs.length).toBeGreaterThan(0);
    expect(screen.getByText(/Page/i)).toBeInTheDocument();
  });

  test("should display current page and total pages", () => {
    render(<Pagination {...defaultProps} currentPage={3} totalPages={10} />);
    expect(screen.getByText(/Page/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  test("should disable previous button on first page", () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    const prevButton = screen.getByRole("button", { name: /Previous page/i });
    expect(prevButton).toBeDisabled();
  });

  test("should disable next button on last page", () => {
    render(<Pagination {...defaultProps} currentPage={5} totalPages={5} />);
    const nextButtons = screen.getAllByRole("button", { name: /Next page/i });
    expect(nextButtons.length).toBeGreaterThan(0);
    expect(nextButtons[0]).toBeDisabled();
  });

  test("should call onPrev when previous button is clicked", async () => {
    const user = userEvent.setup();
    const onPrev = jest.fn();
    render(<Pagination {...defaultProps} currentPage={2} onPrev={onPrev} />);

    const prevButton = screen.getByRole("button", { name: /Previous page/i });
    await user.click(prevButton);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  test("should call onNext when next button is clicked", async () => {
    const user = userEvent.setup();
    const onNext = jest.fn();
    render(<Pagination {...defaultProps} currentPage={2} onNext={onNext} />);

    const nextButtons = screen.getAllByRole("button", { name: /Next page/i });
    if (nextButtons.length > 0) {
      await user.click(nextButtons[0]);
      expect(onNext).toHaveBeenCalledTimes(1);
    }
  });
});
