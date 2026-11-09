// components/auth/SessionTimeoutWatcher.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 6 hours in milliseconds
const SIX_HOURS_IN_MS = 6 * 60 * 60 * 1000;

export default function SessionTimeoutWatcher() {
  const router = useRouter();
  const supabase = createClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkSessionExpiration = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isMounted) return;

        const lastSignIn = user.last_sign_in_at || user.created_at;
        const loginTime = lastSignIn ? new Date(lastSignIn).getTime() : Date.now();
        const elapsed = Date.now() - loginTime;
        const remaining = SIX_HOURS_IN_MS - elapsed;

        if (remaining <= 0) {
          // Session expired beyond 6 hours
          await supabase.auth.signOut();
          document.cookie = "dompetku_login_time=; path=/; max-age=0";
          router.push("/auth/login?expired=1");
          router.refresh();
        } else {
          // Schedule timeout for exact remaining duration
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(async () => {
            if (!isMounted) return;
            await supabase.auth.signOut();
            document.cookie = "dompetku_login_time=; path=/; max-age=0";
            router.push("/auth/login?expired=1");
            router.refresh();
          }, remaining);
        }
      } catch {
        // Ignore background network error
      }
    };

    checkSessionExpiration();

    // Check on tab visibility change (e.g. laptop wake or returning to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSessionExpiration();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic heartbeat check every 60 seconds
    const interval = setInterval(checkSessionExpiration, 60 * 1000);

    return () => {
      isMounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, supabase]);

  return null;
}

