import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  console.log("🔥 CALLBACK ROUTE HIT!");
  
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  
  console.log("📍 Full URL:", requestUrl.href);
  console.log("🔑 Code:", code);

  if (code) {
    console.log("✅ Code exists, exchanging for session...");
    
    const cookieStore = await cookies(); // ← Added await here
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("❌ Exchange error:", error);
      return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
    }
    
    console.log("✅ Session created:", data.session?.user?.email);
  } else {
    console.log("❌ No code found in URL");
  }

  console.log("🚀 Redirecting to /dashboard");
  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}