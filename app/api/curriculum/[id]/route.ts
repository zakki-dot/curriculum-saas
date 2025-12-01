import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getUserAndRole } from "@/lib/getUserRole";

// PUT - Update curriculum item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { user, role } = await getUserAndRole();

    if (!user || (role !== "admin" && role !== "administrator")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // ✅ Changed "curriculum" to "curriculum_entries"
    const { data, error } = await supabaseServer
      .from("curriculum_entries")  // ← CHANGED THIS
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("PUT /api/curriculum/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update curriculum" },
      { status: 500 }
    );
  }
}

// DELETE - Remove curriculum item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { user, role } = await getUserAndRole();

    if (!user || (role !== "admin" && role !== "administrator")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // ✅ Changed "curriculum" to "curriculum_entries"
    const { error } = await supabaseServer
      .from("curriculum_entries")  // ← CHANGED THIS
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Curriculum item deleted",
    });
  } catch (error: any) {
    console.error("DELETE /api/curriculum/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete curriculum" },
      { status: 500 }
    );
  }
}