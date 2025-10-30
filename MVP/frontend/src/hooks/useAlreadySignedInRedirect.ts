import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";

type Opts = {
  suppress?: boolean;
  redirectTo?: string;
  silent?: boolean;
  delayMs?: number;
};

export function useAlreadySignedInRedirect(opts: Opts = {}) {
  const {
    suppress = false,
    redirectTo = "/dashboard",
    silent = false,
    delayMs = 1800,
  } = opts;

  const { isSignedIn, isLoaded } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const toastedRef = useRef(false);
  const scheduledRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const fallbackRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoaded || suppress) return;

    const onAuthPage = /^\/(login|signup)(?:\/|$)/i.test(pathname);
    if (!onAuthPage || !isSignedIn) return;

    const justSignedUp = sessionStorage.getItem("signupJustCompleted") === "1";
    if (justSignedUp) {
      sessionStorage.removeItem("signupJustCompleted");
      return;
    }

    const justAuthed = sessionStorage.getItem("authRedirect") === "1";
    sessionStorage.removeItem("authRedirect");

    if (!silent && !justAuthed && !toastedRef.current) {
      toastedRef.current = true;
      requestAnimationFrame(() => {
        toast.info("You’re already signed in. Sending you to your dashboard…", {
          theme: "dark",
          icon: false,
          closeButton: false,
        });
      });
    }

    if (!scheduledRef.current) {
      scheduledRef.current = true;

      timeoutRef.current = window.setTimeout(() => {
        try {
          navigate(redirectTo, { replace: true });
        } catch {
          window.location.replace(redirectTo);
        }
      }, Math.max(0, delayMs));

      fallbackRef.current = window.setTimeout(() => {
        if (window.location.pathname !== redirectTo) {
          window.location.replace(redirectTo);
        }
      }, Math.max(0, delayMs + 1800));
    }
  }, [
    isLoaded,
    isSignedIn,
    pathname,
    navigate,
    suppress,
    redirectTo,
    silent,
    delayMs,
  ]);
}