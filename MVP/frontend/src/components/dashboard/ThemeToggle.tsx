import { useEffect, useState } from "react";

export default function ThemeToggle() {
    const [isLight, setIsLight] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        const root = document.documentElement;
        const light = saved === "light";
        setIsLight(light);
        root.classList.toggle("light", light);
    }, []);

    const toggle = () => {
        const root = document.documentElement;
        const next = !isLight;
        setIsLight(next);
        root.classList.toggle("light", next);
        localStorage.setItem("theme", next ? "light" : "dark");
    };

    return (
        <button
            onClick={toggle}
            className="px-3 py-2 rounded-lg bg-elevated text-app border border-app"
            aria-label="Toggle theme"
            title="Toggle theme"
        >
            {isLight ? "Light" : "Dark"}
        </button>
    );
}