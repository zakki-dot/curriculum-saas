import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getUserAndRole } from "@/lib/getUserRole";

export async function POST(req: Request) {
  try {
    // 🔐 Authenticate user
    const { user, role } = await getUserAndRole();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 }
      );
    }

    // 🔐 Allow only admin + owner
    if (!["administrator", "owner"].includes(role)) {
      return NextResponse.json(
        { error: "Not authorized. Only administrators and owners can upload data." },
        { status: 403 }
      );
    }

    const { rows } = await req.json();

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Invalid data format. Expected an array of rows." },
        { status: 400 }
      );
    }

    // Insert all rows into curriculum_entries
    const { data, error } = await supabaseServer
      .from("curriculum_entries")
      .insert(rows)
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      data: data
    });

  } catch (err: any) {
    console.error("CSV Upload Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload CSV" },
      { status: 500 }
    );
  }
}

