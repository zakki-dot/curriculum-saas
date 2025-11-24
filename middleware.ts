import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protect only /admin routes
export const config = {
  matcher: ["/admin/:path*"],
};

export function middleware(req: NextRequest) {
  // Read the Supabase session cookie
  const session = req.cookies.get("sb-access-token");

  // If no session, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}
