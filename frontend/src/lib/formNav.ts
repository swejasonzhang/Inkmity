import type { KeyboardEvent } from "react";

const SKIP_TYPES = new Set([
    "checkbox",
    "radio",
    "button",
    "submit",
    "reset",
    "file",
    "range",
]);

export function advanceOnEnterIfEmpty(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.isDefaultPrevented()) return;

    const el = e.target as HTMLElement;
    if (el.tagName !== "INPUT") return;

    const input = el as HTMLInputElement;
    if (SKIP_TYPES.has(input.type)) return;
    if (input.value.trim().length > 0) return;

    const fields = Array.from(
        e.currentTarget.querySelectorAll<HTMLElement>(
            'input:not([type="hidden"]), select, textarea'
        )
    ).filter((n) => {
        const f = n as HTMLInputElement;
        return !f.disabled && !f.readOnly && n.tabIndex !== -1 && n.offsetParent !== null;
    });

    const idx = fields.indexOf(input);
    if (idx === -1) return;

    e.preventDefault();
    fields[idx + 1]?.focus();
}
