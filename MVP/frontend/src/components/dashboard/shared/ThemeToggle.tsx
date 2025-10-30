import { useEffect, useState } from "react";

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    function getScope(): HTMLElement | null {
        const el = document.getElementById("dashboard-portal-root");
        if (el) {
            const scope = el.closest(".dashboard-theme") as HTMLElement | null;
            if (scope) return scope;
        }
        return document.querySelector(".dashboard-theme") as HTMLElement | null;
    }

    useEffect(() => {
        const scope = getScope();
        const saved = localStorage.getItem("dashboard-theme");
        const preferDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
        const dark = saved ? saved === "dark" : preferDark;
        setIsDark(Boolean(dark));
        if (scope) {
            scope.classList.toggle("dark", Boolean(dark));
        }
    }, []);

    const toggle = () => {
        const nextDark = !isDark;
        setIsDark(nextDark);
        const scope = getScope();
        if (scope) scope.classList.toggle("dark", nextDark);
        try {
            localStorage.setItem("dashboard-theme", nextDark ? "dark" : "light");
        } catch { }
    };

    return (
        <button
            onClick={toggle}
            className="px-3 py-2 rounded-lg bg-elevated text-app border border-app"
            aria-label="Toggle theme"
            title="Toggle theme"
        >
            {isDark ? "Dark" : "Light"}
        </button>
    );
}
