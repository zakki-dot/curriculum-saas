"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";

export default function LoginPage() {
  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/admin`,
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <button
        onClick={signIn}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}
