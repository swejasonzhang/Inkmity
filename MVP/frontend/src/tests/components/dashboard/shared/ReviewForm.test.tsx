import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const { default: ReviewForm } = await import("@/components/dashboard/shared/ReviewForm");

describe("ReviewForm", () => {
  const defaultProps = {
    onSubmit: jest.fn<(data: { rating: number; comment: string }) => void>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render review form", () => {
    render(<ReviewForm {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Write a review/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit Review/i })).toBeInTheDocument();
  });

  test("should call onSubmit with form data", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<ReviewForm onSubmit={onSubmit} />);

    const commentInput = screen.getByPlaceholderText(/Write a review/i);
    await user.type(commentInput, "Great artist!");

    const submitButton = screen.getByRole("button", { name: /Submit Review/i });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      rating: 5,
      comment: "Great artist!",
    });
  });

  test("should allow changing rating", async () => {
    const user = userEvent.setup();
    render(<ReviewForm {...defaultProps} />);

    const ratingInput = screen.getByRole("spinbutton");
    await user.clear(ratingInput);
    await user.type(ratingInput, "4");
    expect(ratingInput).toHaveValue(4);
  });
});
