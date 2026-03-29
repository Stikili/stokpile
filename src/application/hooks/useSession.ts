import { useState, useEffect, useRef } from "react";
import { api, getAccessToken, setAccessToken } from "@/infrastructure/api";
import { toast } from "sonner";
import type { Session } from "@/domain/types";

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIMEOUT = 25 * 60 * 1000; // 25 minutes - show warning

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedSessionRef = useRef(false);

  const clearTimers = () => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  };

  const handleSessionExpired = async () => {
    clearTimers();
    try {
      await api.signout();
    } catch (error) {
      console.error("Sign out error:", error);
    }
    setAccessToken(null);
    setSession(null);
    toast.error("Session expired. Please sign in again.", {
      duration: 5000,
    });
  };

  const resetSessionTimer = () => {
    clearTimers();

    // Show warning before expiry
    const warning = setTimeout(() => {
      toast.warning("Your session will expire in 5 minutes due to inactivity.", {
        duration: 5000,
        action: {
          label: "Stay logged in",
          onClick: () => resetSessionTimer(),
        },
      });
    }, WARNING_TIMEOUT);

    // Expire session
    const timeout = setTimeout(() => {
      handleSessionExpired();
    }, SESSION_TIMEOUT);

    warningTimerRef.current = warning;
    sessionTimerRef.current = timeout;
  };

  const checkSession = async () => {
    try {
      const token = getAccessToken();
      if (token) {
        const data = await api.getSession();
        if (data?.session) {
          setSession(data.session as Session);
          resetSessionTimer();
        } else {
          setAccessToken(null);
        }
      }
    } catch (error) {
      console.error("Session check failed:", error);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    clearTimers();
    try {
      await api.signout();
    } catch (error) {
      console.error("Sign out error:", error);
    }
    localStorage.removeItem("rememberedEmail");
    localStorage.removeItem("rememberMe");
    setAccessToken(null);
    setSession(null);
  };

  useEffect(() => {
    // Only check session once on mount
    if (!hasCheckedSessionRef.current) {
      hasCheckedSessionRef.current = true;
      checkSession();
    }

    // Track user activity only after session is loaded
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const activityHandler = () => {
      if (session?.user?.id) {
        resetSessionTimer();
      }
    };

    if (session) {
      events.forEach((event) => {
        document.addEventListener(event, activityHandler, { passive: true });
      });
    }

    return () => {
      clearTimers();
      events.forEach((event) => {
        document.removeEventListener(event, activityHandler);
      });
    };
  }, [session?.user?.id]); // Only re-attach listeners when user changes

  return {
    session,
    loading,
    checkSession,
    signOut,
  };
}
