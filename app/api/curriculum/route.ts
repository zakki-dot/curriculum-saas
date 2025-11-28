import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET all curriculum entries with optional filters
// No authentication required for reading - all users can view curriculum
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Extract query parameters
    const quarter = searchParams.get("quarter");
    const grade = searchParams.get("grade");
    const subject = searchParams.get("subject");
    const curriculum = searchParams.get("curriculum");
    const week = searchParams.get("week");

    let query = supabaseServer
      .from("curriculum_entries")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply filters if provided
    if (quarter) query = query.eq("quarter", quarter);
    if (grade) query = query.eq("grade", grade);
    if (subject) query = query.eq("subject", subject);
    if (curriculum) query = query.eq("curriculum", curriculum);
    if (week) query = query.eq("week", week);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data.length,
      data: data
    });

  } catch (err: any) {
    console.error("Fetch Curriculum Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch curriculum" },
      { status: 500 }
    );
  }
}
