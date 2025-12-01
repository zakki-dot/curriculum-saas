import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "./supabaseServer";

export async function getUserAndRole() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      }
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  console.log("🔍 getUserAndRole - User:", user?.email);

  if (!user) {
    console.log("❌ No user found");
    return { user: null, role: null };
  }

  const { data: profile, error } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("📋 Profile query result:", { profile, error });

  // Normalize role: treat "admin" as "administrator"
  let normalizedRole = profile?.role ?? null;
  if (normalizedRole === "admin") {
    normalizedRole = "administrator";
  }

  console.log("👤 User role:", normalizedRole);

  return { user, role: normalizedRole };
}