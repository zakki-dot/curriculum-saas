import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET all districts - anyone can read
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("district")
      .select("*")
      .order("name");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch districts" },
      { status: 500 }
    );
  }
}