import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";

type Opts = { suppress?: boolean; redirectTo?: string; silent?: boolean };

export function useAlreadySignedInRedirect(opts: Opts = {}) {
  const { suppress = false, redirectTo = "/dashboard", silent = false } = opts;
  const { isSignedIn, isLoaded } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || suppress || firedRef.current) return;

    const isAuthPage = pathname === "/login" || pathname === "/signup";
    if (!isAuthPage || !isSignedIn) return;

    const justAuthed = sessionStorage.getItem("authRedirect") === "1";
    sessionStorage.removeItem("authRedirect");

    firedRef.current = true;

    if (!silent && !justAuthed) {
      toast.info("You’re already signed in. Sending you to your dashboard…", {
        theme: "dark",
        icon: false,
        closeButton: false,
      });
    }

    navigate(redirectTo, { replace: true });
  }, [isLoaded, isSignedIn, pathname, navigate, suppress, redirectTo, silent]);
}
