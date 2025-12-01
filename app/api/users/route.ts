import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getUserAndRole } from "@/lib/getUserRole";

// Helper function to normalize role names
function normalizeRole(role: string | null): string {
  if (!role) return "viewer";
  if (role === "admin") return "administrator";
  return role;
}

// Helper function to check if a role can be assigned by another role
function canAssignRole(assignerRole: string, targetRole: string): boolean {
  const normalized = normalizeRole(assignerRole);
  
  // Super Administrator can assign: administrator, owner, editor, viewer
  if (normalized === "super_administrator") {
    return ["administrator", "owner", "editor", "viewer"].includes(targetRole);
  }
  
  // Administrator can assign: owner, editor, viewer
  if (normalized === "administrator") {
    return ["owner", "editor", "viewer"].includes(targetRole);
  }
  
  // Owner can assign: editor, viewer
  if (normalized === "owner") {
    return ["editor", "viewer"].includes(targetRole);
  }
  
  return false;
}

// GET all users (with optional district filter)
export async function GET(req: Request) {
  try {
    const { user, role } = await getUserAndRole();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const normalizedRole = normalizeRole(role);

    // Get user's profile to check their district
    const { data: userProfile } = await supabaseServer
      .from("profiles")
      .select("district")
      .eq("id", user.id)
      .single();

    let query = supabaseServer
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Super Administrators, Administrators, and Owners see users in their district
    if (["super_administrator", "administrator", "owner"].includes(normalizedRole)) {
      if (userProfile?.district) {
        query = query.eq("district", userProfile.district);
      }
    } else {
      // Editors and Viewers can only see themselves
      query = query.eq("id", user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (err: any) {
    console.error("Get Users Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST - Add new user
export async function POST(req: Request) {
  try {
    const { user, role } = await getUserAndRole();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const normalizedRole = normalizeRole(role);

    // Only super_administrator, administrator, and owner can add users
    if (!["super_administrator", "administrator", "owner"].includes(normalizedRole)) {
      return NextResponse.json(
        { error: "Not authorized. Only administrators and owners can add users." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, assignedRole, district, assigned_subject, assigned_grade } = body;

    if (!email || !assignedRole) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    // Check if the assigner can assign this role
    if (!canAssignRole(normalizedRole, assignedRole)) {
      return NextResponse.json(
        { error: `You cannot assign the role: ${assignedRole}` },
        { status: 403 }
      );
    }

    // Get the user's district
    let userDistrict = district;
    if (!userDistrict) {
      const { data: userProfile } = await supabaseServer
        .from("profiles")
        .select("district")
        .eq("id", user.id)
        .single();
      userDistrict = userProfile?.district;
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseServer
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Create profile
    const { data: newProfile, error: profileError } = await supabaseServer
      .from("profiles")
      .insert({
        id: crypto.randomUUID(),
        email: email,
        role: assignedRole,
        district: userDistrict,
        assigned_subject: assigned_subject || null,
        assigned_grade: assigned_grade || null
      })
      .select()
      .single();

    if (profileError) throw profileError;

    return NextResponse.json({
      success: true,
      data: newProfile
    });

  } catch (err: any) {
    console.error("Add User Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add user" },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(req: Request) {
  try {
    const { user, role } = await getUserAndRole();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const normalizedRole = normalizeRole(role);

    if (!["super_administrator", "administrator", "owner"].includes(normalizedRole)) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, role: newRole, district, assigned_subject, assigned_grade } = body;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if the assigner can assign this new role
    if (newRole && !canAssignRole(normalizedRole, newRole)) {
      return NextResponse.json(
        { error: `You cannot assign the role: ${newRole}` },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (newRole) updateData.role = newRole;
    if (district !== undefined) updateData.district = district;
    if (assigned_subject !== undefined) updateData.assigned_subject = assigned_subject;
    if (assigned_grade !== undefined) updateData.assigned_grade = assigned_grade;

    const { data, error } = await supabaseServer
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });

  } catch (err: any) {
    console.error("Update User Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE - Remove user
export async function DELETE(req: Request) {
  try {
    const { user, role } = await getUserAndRole();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const normalizedRole = normalizeRole(role);

    // Only super_administrator and administrator can delete users
    if (!["super_administrator", "administrator"].includes(normalizedRole)) {
      return NextResponse.json(
        { error: "Only administrators can delete users" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Don't allow deleting yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (err: any) {
    console.error("Delete User Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}