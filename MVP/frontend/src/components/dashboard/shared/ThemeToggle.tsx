import { useEffect, useState } from "react";

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        const root = document.documentElement;
        const dark = saved ? saved === "dark" : root.classList.contains("dark");
        setIsDark(dark);
        if (dark) {
            root.classList.add("dark");
            document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", "dark light");
        } else {
            root.classList.remove("dark");
            document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", "light dark");
        }
    }, []);

    const toggle = () => {
        const root = document.documentElement;
        const nextDark = !isDark;
        setIsDark(nextDark);
        if (nextDark) {
            root.classList.add("dark");
            localStorage.setItem("theme", "dark");
            document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", "dark light");
        } else {
            root.classList.remove("dark");
            localStorage.setItem("theme", "light");
            document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", "light dark");
        }
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