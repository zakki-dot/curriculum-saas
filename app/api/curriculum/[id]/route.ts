import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getUserAndRole } from "@/lib/getUserRole";

// GET single entry by ID - anyone can read
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseServer
      .from("curriculum_entries")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Entry not found" },
      { status: 404 }
    );
  }
}

// UPDATE entry - requires admin or owner role
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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
        { error: "Not authorized. Only administrators and owners can edit entries." },
        { status: 403 }
      );
    }

    const updates = await req.json();

    const { data, error } = await supabaseServer
      .from("curriculum_entries")
      .update(updates)
      .eq("id", params.id)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data[0]
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update entry" },
      { status: 500 }
    );
  }
}

// DELETE entry - requires admin or owner role
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
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
        { error: "Not authorized. Only administrators and owners can delete entries." },
        { status: 403 }
      );
    }

    const { error } = await supabaseServer
      .from("curriculum_entries")
      .delete()
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Entry deleted successfully"
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete entry" },
      { status: 500 }
    );
  }
}

