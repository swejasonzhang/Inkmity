import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ThemeBridge() {
    const { pathname } = useLocation();
    const isDashboard = pathname.startsWith("/dashboard");

    useEffect(() => {
        const scope =
            (document.getElementById("dashboard-scope") as HTMLElement | null) ||
            (document.querySelector(".ink-scope") as HTMLElement | null) ||
            document.documentElement;

        const root = document.documentElement;

        const vars = [
            "--background",
            "--foreground",
            "--card",
            "--card-h",
            "--card-foreground",
            "--popover",
            "--popover-foreground",
            "--primary",
            "--primary-foreground",
            "--secondary",
            "--secondary-foreground",
            "--muted",
            "--muted2",
            "--muted-foreground",
            "--accent",
            "--accent-h",
            "--accent-foreground",
            "--border",
            "--border-h",
            "--input",
            "--ring",
            "--bg",
            "--fg",
            "--subtle",
            "--elevated",
        ];

        const applyFromScope = () => {
            if (!scope) return;
            const cs = getComputedStyle(scope);
            vars.forEach((v) => {
                const val = cs.getPropertyValue(v);
                if (val) root.style.setProperty(v, val.trim());
            });
        };

        const resetToRootDefaults = () => {
            vars.forEach((v) => root.style.removeProperty(v));
        };

        if (isDashboard) {
            applyFromScope();
        } else {
            scope.classList.remove("ink-light");
            resetToRootDefaults();
        }

        const mo = new MutationObserver(() => {
            if (isDashboard) applyFromScope();
        });
        if (scope) mo.observe(scope, { attributes: true, attributeFilter: ["class", "style"] });

        const onBus = () => {
            if (isDashboard) applyFromScope();
        };
        window.addEventListener("ink:theme-change", onBus);

        return () => {
            mo.disconnect();
            window.removeEventListener("ink:theme-change", onBus);
        };
    }, [pathname]);

    return null;
}
