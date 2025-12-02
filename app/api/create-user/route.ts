import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Role hierarchy (higher number = higher privilege)
const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
  admin: 4,
  administrator: 4,
  super_administrator: 5,
};

function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role] || 0;
}

function canAssignRole(requesterRole: string, targetRole: string): boolean {
  const requesterLevel = getRoleLevel(requesterRole);
  const targetLevel = getRoleLevel(targetRole);
  return targetLevel < requesterLevel;
}

function canModifyUser(requesterRole: string, targetUserRole: string): boolean {
  const requesterLevel = getRoleLevel(requesterRole);
  const targetLevel = getRoleLevel(targetUserRole);
  return targetLevel < requesterLevel;
}

// Extract and combine chunked cookies
function getCombinedCookie(cookies: Record<string, string>, baseName: string): string | null {
  // Check if it's a chunked cookie (.0, .1, .2, etc.)
  const chunks: string[] = [];
  let i = 0;
  
  while (true) {
    const chunkName = `${baseName}.${i}`;
    if (cookies[chunkName]) {
      chunks.push(cookies[chunkName]);
      i++;
    } else {
      break;
    }
  }
  
  if (chunks.length > 0) {
    console.log(`✅ Found ${chunks.length} cookie chunks, combining...`);
    return chunks.join('');
  }
  
  // Not chunked, return as-is
  return cookies[baseName] || null;
}

// Extract access token from cookies
function getAccessTokenFromCookies(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie');
  
  if (!cookieHeader) {
    console.error("❌ No cookie header found");
    return null;
  }

  console.log("🍪 Cookie header exists");
  
  // Parse all cookies
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [key, ...valueParts] = cookie.trim().split('=');
    if (key) {
      cookies[key] = valueParts.join('=');
    }
  });

  console.log("🔍 Available cookies:", Object.keys(cookies));

  // Find the auth token cookie (might be chunked)
  const authCookieBase = Object.keys(cookies).find(key => 
    key.startsWith('sb-') && key.includes('auth-token') && !key.includes('verifier')
  )?.replace(/\.\d+$/, ''); // Remove .0, .1, etc. suffix

  if (!authCookieBase) {
    console.error("❌ No auth cookie found");
    return null;
  }

  console.log(`✅ Found auth cookie base: ${authCookieBase}`);

  // Get combined cookie value (handles chunking)
  let cookieValue = getCombinedCookie(cookies, authCookieBase);
  
  if (!cookieValue) {
    console.error("❌ Could not get cookie value");
    return null;
  }

  console.log(`📦 Cookie value type: ${cookieValue.substring(0, 20)}...`);

  try {
    // Decode if it's URL-encoded
    cookieValue = decodeURIComponent(cookieValue);
    
    // Check if it's base64-encoded
    if (cookieValue.startsWith('base64-')) {
      console.log("🔓 Decoding base64...");
      cookieValue = Buffer.from(cookieValue.substring(7), 'base64').toString('utf-8');
    }
    
    // Parse JSON
    const authData = JSON.parse(cookieValue);
    
    if (authData && authData.access_token) {
      console.log("✅ Successfully extracted access token");
      return authData.access_token;
    } else {
      console.error("❌ No access_token in parsed data");
      return null;
    }
  } catch (e) {
    console.error("❌ Failed to parse cookie:", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role, district, assigned_subject, assigned_grade } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    console.log(`📝 Request to add user: ${email} as ${role}`);

    // 1. Get access token from cookies
    const accessToken = getAccessTokenFromCookies(request);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - No auth token" },
        { status: 401 }
      );
    }

    // 2. Get user from access token
    const { data: { user: requestingUser }, error: userError } = 
      await supabaseAdmin.auth.getUser(accessToken);
    
    if (userError || !requestingUser) {
      console.error("❌ Failed to get user from token:", userError);
      return NextResponse.json(
        { error: "Unauthorized - Invalid session" },
        { status: 401 }
      );
    }

    console.log(`✅ Authenticated user: ${requestingUser.email}`);

    // 3. Get requesting user's profile
    const { data: requestingProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", requestingUser.id)
      .single();

    if (profileError || !requestingProfile) {
      console.error("❌ Could not get requesting user's profile:", profileError);
      return NextResponse.json(
        { error: "Could not verify your permissions" },
        { status: 403 }
      );
    }

    const requestingUserRole = requestingProfile.role;
    console.log(`👤 Requesting user role: ${requestingUserRole}`);

    // 4. Check if requesting user can assign this role
    if (!canAssignRole(requestingUserRole, role)) {
      console.log(`🚫 ${requestingProfile.email} (${requestingUserRole}) tried to assign role: ${role}`);
      return NextResponse.json(
        { error: `You don't have permission to assign the role: ${role}` },
        { status: 403 }
      );
    }

    // 5. Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Error listing users:", listError);
      return NextResponse.json(
        { error: "Failed to check existing users" },
        { status: 500 }
      );
    }

    const existingUser = existingUsers.users.find(u => u.email === email);

    // 6. If user exists, handle their profile
    if (existingUser) {
      console.log(`✅ Auth user exists: ${email} (${existingUser.id})`);
      
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", existingUser.id)
        .single();

      if (existingProfile) {
        // Profile exists - check permissions and update
        if (!canModifyUser(requestingUserRole, existingProfile.role)) {
          console.log(`🚫 PRIVILEGE ESCALATION BLOCKED:`);
          console.log(`   Attacker: ${requestingProfile.email} (${requestingUserRole})`);
          console.log(`   Target: ${existingProfile.email} (${existingProfile.role})`);
          
          return NextResponse.json(
            { error: `You don't have permission to modify users with role: ${existingProfile.role}` },
            { status: 403 }
          );
        }

        // Update the profile
        console.log(`🔄 Updating existing profile for: ${email}`);
        
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            role,
            district: district || null,
            assigned_subject: assigned_subject || null,
            assigned_grade: assigned_grade || null,
          })
          .eq("id", existingUser.id);

        if (updateError) {
          console.error("❌ Update error:", updateError);
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "User updated successfully",
          user: { id: existingUser.id, email, role, district }
        });
      } else {
        // Auth user exists but no profile - create profile
        console.log(`➕ Creating profile for existing auth user: ${email}`);
        
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({
            id: existingUser.id,
            email,
            role,
            district: district || null,
            assigned_subject: assigned_subject || null,
            assigned_grade: assigned_grade || null,
          });

        if (profileError) {
          console.error("❌ Profile creation error:", profileError);
          return NextResponse.json(
            { error: profileError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Profile created for existing user",
          user: { id: existingUser.id, email, role, district }
        });
      }
    }

    // 7. Create new user (only if auth user doesn't exist)
    console.log(`➕ Creating new auth user: ${email}`);
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { role, district }
    });

    if (authError) {
      console.error("❌ Auth creation error:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Wait for triggers
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if profile was auto-created
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (existingProfile) {
      // Update it
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          role,
          district: district || null,
          assigned_subject: assigned_subject || null,
          assigned_grade: assigned_grade || null,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Profile update error:", updateError);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          email,
          role,
          district: district || null,
          assigned_subject: assigned_subject || null,
          assigned_grade: assigned_grade || null,
        });

      if (profileError) {
        console.error("❌ Profile creation error:", profileError);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: profileError.message },
          { status: 500 }
        );
      }
    }

    console.log(`✅ User created successfully`);
    
    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: { id: userId, email, role, district }
    });

  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}