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
        { error: "Not authorized. Only administrators and owners can add entries." },
        { status: 403 }
      );
    }

    const formData = await req.json();

    // Validate that at least one field exists
    if (!formData || Object.keys(formData).length === 0) {
      return NextResponse.json(
        { error: "No data provided" },
        { status: 400 }
      );
    }

    // Insert single entry
    const { data, error } = await supabaseServer
      .from("curriculum_entries")
      .insert([formData])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data[0]
    });

  } catch (err: any) {
    console.error("Manual Entry Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save entry" },
      { status: 500 }
    );
  }
}

