import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET all subjects - anyone can read
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("subject")
      .select("*")
      .order("name");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}