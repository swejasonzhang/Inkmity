import { describe, test, expect, beforeAll, afterAll, afterEach, jest } from "@jest/globals";
import type { KeyboardEvent } from "react";
import { advanceOnEnterIfEmpty } from "@/lib/formNav";

// jsdom does not compute layout, so offsetParent is always null. The helper
// uses it as a visibility check, so expose a truthy value for attached nodes.
let originalDesc: PropertyDescriptor | undefined;
beforeAll(() => {
  originalDesc = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "offsetParent");
  Object.defineProperty(window.HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get(this: HTMLElement) {
      return this.parentNode;
    },
  });
});
afterAll(() => {
  if (originalDesc) Object.defineProperty(window.HTMLElement.prototype, "offsetParent", originalDesc);
});
afterEach(() => {
  document.body.innerHTML = "";
});

function buildForm(types: string[] = ["text", "text"]) {
  const container = document.createElement("div");
  const inputs = types.map((t) => {
    const el = document.createElement(t === "textarea" ? "textarea" : "input");
    if (el instanceof HTMLInputElement) el.type = t;
    return el as HTMLInputElement;
  });
  container.append(...inputs);
  document.body.append(container);
  return { container, inputs };
}

function makeEvent(target: HTMLElement, currentTarget: HTMLElement, over: Partial<KeyboardEvent> = {}) {
  const preventDefault = jest.fn();
  const ev = {
    key: "Enter",
    shiftKey: false,
    target,
    currentTarget,
    isDefaultPrevented: () => false,
    preventDefault,
    ...over,
  } as unknown as KeyboardEvent<HTMLElement>;
  return { ev, preventDefault };
}

describe("advanceOnEnterIfEmpty", () => {
  test("moves focus to the next field when the current one is empty", () => {
    const { container, inputs } = buildForm();
    inputs[0].focus();
    const { ev, preventDefault } = makeEvent(inputs[0], container);

    advanceOnEnterIfEmpty(ev);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(inputs[1]);
  });

  test("does nothing when the current field has a value", () => {
    const { container, inputs } = buildForm();
    inputs[0].value = "filled";
    inputs[0].focus();
    const { ev, preventDefault } = makeEvent(inputs[0], container);

    advanceOnEnterIfEmpty(ev);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(inputs[0]);
  });

  test("ignores non-Enter keys", () => {
    const { container, inputs } = buildForm();
    inputs[0].focus();
    const { ev, preventDefault } = makeEvent(inputs[0], container, { key: "a" });

    advanceOnEnterIfEmpty(ev);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(inputs[0]);
  });

  test("ignores Shift+Enter", () => {
    const { container, inputs } = buildForm();
    inputs[0].focus();
    const { ev, preventDefault } = makeEvent(inputs[0], container, { shiftKey: true });

    advanceOnEnterIfEmpty(ev);

    expect(preventDefault).not.toHaveBeenCalled();
  });

  test("ignores textareas so newlines still work", () => {
    const { container, inputs } = buildForm(["textarea", "text"]);
    const { ev, preventDefault } = makeEvent(inputs[0], container);

    advanceOnEnterIfEmpty(ev);

    expect(preventDefault).not.toHaveBeenCalled();
  });

  test("blocks submit on the last empty field but has nowhere to advance", () => {
    const { container, inputs } = buildForm();
    inputs[1].focus();
    const { ev, preventDefault } = makeEvent(inputs[1], container);

    advanceOnEnterIfEmpty(ev);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(inputs[1]);
  });

  test("skips checkboxes (not a text field)", () => {
    const { container, inputs } = buildForm(["checkbox", "text"]);
    const { ev, preventDefault } = makeEvent(inputs[0], container);

    advanceOnEnterIfEmpty(ev);

    expect(preventDefault).not.toHaveBeenCalled();
  });
});
