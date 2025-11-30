
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getUserAndRole } from "@/lib/getUserRole";

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

    // Get user's profile to check their district
    const { data: userProfile } = await supabaseServer
      .from("profiles")
      .select("district")
      .eq("id", user.id)
      .single();

    let query = supabaseServer
      .from("profiles")
      .select("*")
      .order("email");

    // Administrators see all users in their district
    // Owners see editors and viewers in their district
    if (role === "administrator" || role === "owner") {
      if (userProfile?.district) {
        query = query.eq("district", userProfile.district);
      }
    } else {
      // Viewers can only see themselves
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

    // Only administrators and owners can add users
    // Accept both "admin" and "administrator" for backwards compatibility
    const isAdmin = role === "administrator" || role === "admin";
    const isOwner = role === "owner";
    
    if (!isAdmin && !isOwner) {
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

    // Owners cannot create administrators
    // Accept both "admin" and "administrator"
    if (role === "owner" && (assignedRole === "administrator" || assignedRole === "admin")) {
      return NextResponse.json(
        { error: "Owners cannot create administrators" },
        { status: 403 }
      );
    }

    // Get the user's district if they're not an admin
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
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Create profile (user will be created when they sign up with this email)
    const { data: newProfile, error: profileError } = await supabaseServer
      .from("profiles")
      .insert({
        id: crypto.randomUUID(), // Temporary ID until they sign up
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

    // Accept both "admin" and "administrator"
    const isAdmin = role === "administrator" || role === "admin";
    const isOwner = role === "owner";

    if (!isAdmin && !isOwner) {
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

    // Owners cannot promote to administrator
    // Accept both "admin" and "administrator"
    if (role === "owner" && (newRole === "administrator" || newRole === "admin")) {
      return NextResponse.json(
        { error: "Owners cannot create administrators" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (newRole) updateData.role = newRole;
    if (district) updateData.district = district;
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

    // Accept both "admin" and "administrator"
    const isAdmin = role === "administrator" || role === "admin";
    
    if (!isAdmin) {
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