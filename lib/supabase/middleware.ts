// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// 6-hour session timeout limit (in milliseconds)
const SIX_HOURS_IN_MS = 6 * 60 * 60 * 1000;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session and get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/auth");

  // Check 6-hour session expiration for authenticated users
  if (user) {
    const lastSignIn = user.last_sign_in_at || user.created_at;
    const cookieLoginTime = request.cookies.get("dompetku_login_time")?.value;

    let loginTimestamp = lastSignIn ? new Date(lastSignIn).getTime() : 0;
    if (cookieLoginTime && !isNaN(Number(cookieLoginTime))) {
      const parsedCookie = Number(cookieLoginTime);
      if (loginTimestamp === 0 || parsedCookie < loginTimestamp) {
        loginTimestamp = parsedCookie;
      }
    }

    const now = Date.now();
    const isExpired = loginTimestamp > 0 && now - loginTimestamp > SIX_HOURS_IN_MS;

    if (isExpired) {
      // Invalidate Supabase session
      await supabase.auth.signOut();

      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("expired", "1");

      const redirectResponse = NextResponse.redirect(url);
      // Clear all session cookies
      request.cookies.getAll().forEach((c) => {
        if (c.name.startsWith("sb-") || c.name.includes("dompetku")) {
          redirectResponse.cookies.delete(c.name);
        }
      });
      return redirectResponse;
    }
  }

  // Redirect unauthenticated users to login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
