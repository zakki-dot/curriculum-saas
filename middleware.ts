import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Client for auth (uses anon key)
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set(name, value, options),
        remove: (name, options) => res.cookies.set(name, "", options),
      },
    }
  );

  // Client for database queries (uses service role to bypass RLS)
  const supabaseService = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set(name, value, options),
        remove: (name, options) => res.cookies.set(name, "", options),
      },
    }
  );

  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  const url = req.nextUrl.pathname;

  // Debug: Log all requests
  console.log("\n🔵 MIDDLEWARE:", url);

  // Redirect logged-in users AWAY from login page
  if (url === "/login" && session) {
    console.log("✅ User logged in, redirecting away from /login");
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect dashboard
  if (url.startsWith("/dashboard") && !session) {
    console.log("❌ No session, redirecting to /login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Protect admin routes — must check roles!
  if (url.startsWith("/admin")) {
    if (!session) {
      console.log("❌ No session for admin route, redirecting to /login");
      return NextResponse.redirect(new URL("/login", req.url));
    }

    console.log("🔍 Checking admin access for:", session.user.email);
    console.log("   Session User ID:", session.user.id);

    // Get user role from profiles table using SERVICE ROLE (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select("role, email, district")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      console.error("❌ Error fetching profile:", profileError);
      console.log("   This usually means no profile exists for this user");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const role = profile?.role;

    // Detailed logging
    console.log("📋 Profile Data:");
    console.log("   Email:", profile?.email);
    console.log("   Role:", role);
    console.log("   District:", profile?.district);
    console.log("   Requested URL:", url);

    // Only allow admin, administrator, super_administrator, and owner to access /admin routes
    const allowedRoles = ["admin", "administrator", "super_administrator", "owner"];
    
    if (!role) {
      console.log("❌ No role found in profile!");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (!allowedRoles.includes(role)) {
      console.log(`❌ Access denied to ${url}`);
      console.log(`   User role "${role}" is not in allowed roles:`, allowedRoles);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    console.log(`✅ Access granted to ${url} for role: ${role}`);

    // Additional check: /admin/users should be accessible by admins, super admins, and owners
    if (url.startsWith("/admin/users")) {
      const usersPageRoles = ["admin", "administrator", "super_administrator", "owner"];
      if (!usersPageRoles.includes(role)) {
        console.log(`❌ Access denied to /admin/users for role: ${role}`);
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      console.log(`✅ Access granted to /admin/users for role: ${role}`);
    }
  }

  return res;
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/admin/:path*"],
};