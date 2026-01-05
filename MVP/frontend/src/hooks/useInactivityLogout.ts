import { useEffect, useRef, useCallback } from "react";
import { useClerk, useAuth } from "@clerk/clerk-react";

const INACTIVITY_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "lastActivityTimestamp";

export function useInactivityLogout() {
  const { signOut } = useClerk();
  const { isSignedIn, isLoaded } = useAuth();
  const timeoutRef = useRef<number | null>(null);

  const scheduleLogoutTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (!lastActivityStr) return;

      const lastActivity = parseInt(lastActivityStr, 10);
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const remainingTime = INACTIVITY_TIMEOUT_MS - timeSinceActivity;

      if (remainingTime > 0) {
        timeoutRef.current = window.setTimeout(() => {
          if (isSignedIn) {
            signOut({ redirectUrl: "/login" });
          }
        }, remainingTime);
      }
    } catch (error) {
      console.error("Failed to schedule logout timeout:", error);
    }
  }, [isSignedIn, signOut]);

  const updateActivityTimestamp = useCallback(() => {
    try {
      const timestamp = Date.now();
      localStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
      scheduleLogoutTimeout();
    } catch (error) {
      console.error("Failed to update activity timestamp:", error);
    }
  }, [scheduleLogoutTimeout]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      try {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } catch (error) {
        console.error("Failed to remove activity timestamp:", error);
      }
      return;
    }

    try {
      const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
      const now = Date.now();

      if (!lastActivityStr) {
        updateActivityTimestamp();
        return;
      }

      const lastActivity = parseInt(lastActivityStr, 10);
      const timeSinceActivity = now - lastActivity;

      if (timeSinceActivity >= INACTIVITY_TIMEOUT_MS) {
        signOut({ redirectUrl: "/login" });
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } else {
        scheduleLogoutTimeout();
      }
    } catch (error) {
      console.error("Failed to check activity timestamp:", error);
      updateActivityTimestamp();
    }

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isLoaded, isSignedIn, signOut, updateActivityTimestamp, scheduleLogoutTimeout]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const events = ["mousedown", "keypress", "scroll", "touchstart", "click"];
    let lastUpdate = 0;
    const THROTTLE_MS = 60000;
    
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate >= THROTTLE_MS) {
        lastUpdate = now;
        updateActivityTimestamp();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isLoaded, isSignedIn, updateActivityTimestamp]);
}

export function resetActivityTimer() {
  try {
    const timestamp = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
  } catch (error) {
    console.error("Failed to reset activity timer:", error);
  }
}

