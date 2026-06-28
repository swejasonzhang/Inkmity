import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";
import { act } from "@testing-library/react";
import type { PromptConfig } from "@/components/dashboard/shared/PromptModal";
import PromptModal from "@/components/dashboard/shared/PromptModal";

describe("PromptModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders nothing when config is null", () => {
    const { container } = render(<PromptModal config={null} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders title, message and custom labels", () => {
    const config: PromptConfig = {
      title: "Delete it",
      message: "Are you sure?",
      confirmLabel: "Yes do it",
      cancelLabel: "No",
      onConfirm: jest.fn<(value: string) => void>(),
    };
    render(<PromptModal config={config} onClose={jest.fn()} />);
    expect(screen.getByText("Delete it")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes do it" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });

  test("disables confirm when required input is empty and enables after typing", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn(() => Promise.resolve());
    const config: PromptConfig = {
      title: "Reason",
      input: { label: "Why?", placeholder: "Type here", required: true },
      onConfirm,
    };
    render(<PromptModal config={config} onClose={jest.fn()} />);

    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Type here"), "because");
    await waitFor(() => expect(confirm).not.toBeDisabled());
  });

  test("calls onConfirm with trimmed value then onClose", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onConfirm = jest.fn(() => Promise.resolve());
    const config: PromptConfig = {
      title: "Note",
      input: { placeholder: "Type" },
      onConfirm,
    };
    render(<PromptModal config={config} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText("Type"), "  hello  ");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("hello"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("keeps modal open when onConfirm throws", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onConfirm = jest.fn(() => Promise.reject(new Error("fail")));
    const config: PromptConfig = { title: "X", onConfirm };
    render(<PromptModal config={config} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  test("closes on Cancel click", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const config: PromptConfig = { title: "X", onConfirm: jest.fn<(value: string) => void>() };
    render(<PromptModal config={config} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  test("closes on Escape key", async () => {
    const onClose = jest.fn();
    const config: PromptConfig = { title: "X", onConfirm: jest.fn<(value: string) => void>() };
    render(<PromptModal config={config} onClose={onClose} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalled();
  });
});
