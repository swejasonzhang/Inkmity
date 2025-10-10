import { useEffect, useState } from "react";
import whiteLogo from "@/assets/WhiteLogo.png";
import blackLogo from "@/assets/BlackLogo.png";

export const THEME_MS = 600;

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: light)").matches
    ) {
      return "light";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-ms", `${THEME_MS}ms`);
    root.classList.add("theme-smooth");
    root.setAttribute("data-ink-theme", theme);
    root.classList.toggle("light", theme === "light");
    try {
      localStorage.setItem("theme", theme);
    } catch {}
    const id = window.setTimeout(
      () => root.classList.remove("theme-smooth"),
      THEME_MS
    );
    return () => window.clearTimeout(id);
  }, [theme]);

  function runThemeSwitch(next: "light" | "dark") {
    const root = document.documentElement;
    const curtain = document.createElement("div");
    curtain.className = "theme-curtain";
    document.body.appendChild(curtain);
    root.classList.add("theme-smooth");
    requestAnimationFrame(() => setTheme(next));
    window.setTimeout(() => {
      curtain.remove();
      root.classList.remove("theme-smooth");
    }, THEME_MS);
  }

  const toggleTheme = () =>
    runThemeSwitch(theme === "light" ? "dark" : "light");
  const logoSrc = theme === "light" ? blackLogo : whiteLogo;

  return { theme, toggleTheme, logoSrc };
}