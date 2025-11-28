import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET all grades - anyone can read
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("grade")
      .select("*")
      .order("numeric_order");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch grades" },
      { status: 500 }
    );
  }
}