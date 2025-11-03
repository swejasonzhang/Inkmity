import { useEffect } from "react";

type Mode = "dark" | "light";

function readStoredMode(): Mode {
    const v = typeof window !== "undefined" ? window.localStorage.getItem("ink-theme") : null;
    return v === "light" ? "light" : "dark";
}

function writeStoredMode(mode: Mode) {
    try {
        window.localStorage.setItem("ink-theme", mode);
    } catch { }
}

function veilMs(el: HTMLElement) {
    const ms = getComputedStyle(el).getPropertyValue("--veil-ms").trim();
    const n = parseInt(ms.replace("ms", ""), 10);
    return Number.isFinite(n) ? n : 900;
}

export default function ThemeBridge() {
    useEffect(() => {
        document.documentElement.classList.remove("ink-light");
        document.body.classList.remove("ink-light");

        const scope = document.getElementById("dashboard-scope");
        if (!scope) return;

        const apply = (mode: Mode, withVeil: boolean) => {
            if (withVeil) {
                scope.classList.add("ink-theming", "ink-smoothing");
                window.setTimeout(() => scope.classList.remove("ink-theming"), veilMs(scope));
            }
            if (mode === "light") {
                scope.setAttribute("data-ink", "light");
                scope.classList.add("ink-light");
            } else {
                scope.setAttribute("data-ink", "dark");
                scope.classList.remove("ink-light");
            }
        };

        apply(readStoredMode(), true);

        const onStorage = (e: StorageEvent) => {
            if (e.key === "ink-theme") apply(readStoredMode(), true);
        };
        window.addEventListener("storage", onStorage);

        return () => {
            window.removeEventListener("storage", onStorage);
            scope.removeAttribute("data-ink");
            scope.classList.remove("ink-light", "ink-theming", "ink-smoothing");
        };
    }, []);

    return null;
}

export function toggleDashboardTheme() {
    const scope = document.getElementById("dashboard-scope");
    if (!scope) return;
    const next: Mode = scope.classList.contains("ink-light") ? "dark" : "light";
    writeStoredMode(next);
    scope.classList.add("ink-theming", "ink-smoothing");
    window.setTimeout(() => scope.classList.remove("ink-theming"), veilMs(scope));
    if (next === "light") {
        scope.setAttribute("data-ink", "light");
        scope.classList.add("ink-light");
    } else {
        scope.setAttribute("data-ink", "dark");
        scope.classList.remove("ink-light");
    }
}