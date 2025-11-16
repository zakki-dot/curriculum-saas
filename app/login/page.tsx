"use client";

import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <button
        onClick={signInWithGoogle}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
      >
        Sign in with Google
      </button>
    </div>
  );
}
