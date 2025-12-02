"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  email: string;
  role: string;
  district: string | null;
  assigned_subject: string | null;
  assigned_grade: string | null;
  created_at: string;
};

const SUBJECTS = ["ELA", "Math", "Science", "Social Studies", "SLA"];
const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8"];

// Role hierarchy (higher number = higher privilege)
const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
  admin: 4,
  administrator: 4,
  super_administrator: 5,
};

export default function UsersAdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    role: "viewer",
    district: "",
    assigned_subject: "",
    assigned_grade: "",
  });

  // Create Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ✅ FIXED LOGOUT FUNCTION
  async function handleLogout() {
    await supabase.auth.signOut();
    
    document.cookie.split(";").forEach((c) => {
      const cookieName = c.trim().split("=")[0];
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    window.location.href = "/login";
  }

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching current user:", error);
        setMessage(`❌ Error loading profile: ${error.message}`);
        setLoading(false);
        return;
      }

      setCurrentUser(data);
      
      // Set default district for new users
      if (data?.district) {
        setNewUserData(prev => ({ ...prev, district: data.district || "" }));
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setMessage("❌ Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!currentUser) return;

    try {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // Admins see users in their district
      // Super admins see everyone (no filter)
      if (currentUser.role === "administrator" || currentUser.role === "admin") {
        if (currentUser.district) {
          query = query.eq("district", currentUser.district);
        }
      } else if (currentUser.role === "owner") {
        // Owners see only their district
        if (currentUser.district) {
          query = query.eq("district", currentUser.district);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching users:", error);
        setMessage(`❌ Error: ${error.message}`);
      } else {
        // 🔒 SECURITY: Filter out users with equal or higher privilege
        const currentUserLevel = ROLE_HIERARCHY[currentUser.role] || 0;
        const filteredUsers = (data || []).filter(user => {
          const userLevel = ROLE_HIERARCHY[user.role] || 0;
          return userLevel < currentUserLevel; // Only show users with LOWER privilege
        });
        
        setUsers(filteredUsers);
      }
    } catch (err) {
      console.error("Unexpected error fetching users:", err);
      setMessage("❌ Failed to load users");
    }
  };

  const updateUser = async (userId: string, updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) {
        console.error("Update error:", error);
        setMessage(`❌ Error: ${error.message}`);
      } else {
        setMessage("✅ User updated successfully!");
        fetchUsers();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error("Unexpected error updating user:", err);
      setMessage("❌ Failed to update user");
    }
  };

  // ✅ FIXED: Now calls API route with server-side security checks
  const addUser = async () => {
    if (!newUserData.email) {
      setMessage("❌ Email is required");
      return;
    }

    // Check if user can assign this role
    if (!canAssignRole(newUserData.role)) {
      setMessage(`❌ You cannot assign the role: ${newUserData.role}`);
      return;
    }

    setLoading(true);
    try {
      // Call API route to create user properly
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserData.email,
          role: newUserData.role,
          district: newUserData.district || currentUser?.district,
          assigned_subject: newUserData.assigned_subject || null,
          assigned_grade: newUserData.assigned_grade || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user");
      }

      setMessage("✅ User added successfully!");
      setShowAddModal(false);
      setNewUserData({
        email: "",
        role: "viewer",
        district: currentUser?.district || "",
        assigned_subject: "",
        assigned_grade: "",
      });
      fetchUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      console.error("Error adding user:", err);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) {
        console.error("Delete error:", error);
        setMessage(`❌ Error: ${error.message}`);
      } else {
        setMessage("✅ User deleted successfully!");
        fetchUsers();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error("Unexpected error deleting user:", err);
      setMessage("❌ Failed to delete user");
    }
  };

  // Helper functions for role-based permissions
  const isSuperAdmin = () => currentUser?.role === "super_administrator";
  const isAdmin = () => currentUser?.role === "administrator" || currentUser?.role === "admin";
  const isOwner = () => currentUser?.role === "owner";

  const canAssignRole = (role: string): boolean => {
    if (isSuperAdmin()) {
      // Super Admin can assign any role except another super_administrator
      return role !== "super_administrator";
    }
    if (isAdmin()) {
      // Administrator can assign: owner, editor, viewer
      return ["owner", "editor", "viewer"].includes(role);
    }
    if (isOwner()) {
      // Owner can only assign: editor, viewer
      return ["editor", "viewer"].includes(role);
    }
    return false;
  };

  const getAvailableRoles = (): string[] => {
    if (isSuperAdmin()) {
      return ["administrator", "owner", "editor", "viewer"];
    }
    if (isAdmin()) {
      return ["owner", "editor", "viewer"];
    }
    if (isOwner()) {
      return ["editor", "viewer"];
    }
    return ["viewer"];
  };

  const canEditUser = (user: Profile): boolean => {
    if (isSuperAdmin()) return true;
    if (isAdmin()) {
      // Admins can edit owners, editors, and viewers
      return ["owner", "editor", "viewer"].includes(user.role);
    }
    if (isOwner()) {
      // Owners can only edit editors and viewers
      return ["editor", "viewer"].includes(user.role);
    }
    return false;
  };

  const canDeleteUser = (user: Profile): boolean => {
    if (user.id === currentUser?.id) return false; // Can't delete yourself
    return canEditUser(user);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_administrator":
        return "border-purple-500 text-purple-500";
      case "administrator":
      case "admin":
        return "border-red-500 text-red-500";
      case "owner":
        return "border-yellow-500 text-yellow-500";
      case "editor":
        return "border-green-500 text-green-500";
      default:
        return "border-gray-500 text-gray-400";
    }
  };

  const getRoleDisplayName = (role: string) => {
    if (role === "super_administrator") return "Super Administrator";
    if (role === "admin") return "Administrator";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Error Loading Profile</h1>
          <p className="text-gray-400 mt-2">
            Could not load your user profile. Please try logging in again.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User & Role Management</h1>
          <p className="text-gray-400 text-sm">
            Manage users in your district
            {currentUser?.district && <span> ({currentUser.district})</span>}
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            + Add User
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-6">
        {message && (
          <div className={`p-3 rounded mb-4 ${
            message.includes("✅") ? "bg-green-800" : "bg-red-800"
          }`}>
            {message}
          </div>
        )}

        {/* Role Hierarchy Info */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="font-bold mb-3">Your Role: {getRoleDisplayName(currentUser?.role || "")}</h2>
          <div className="text-sm text-gray-400">
            <p className="mb-2">You can assign the following roles:</p>
            <div className="flex gap-2">
              {getAvailableRoles().map(role => (
                <span key={role} className={`px-3 py-1 rounded border ${getRoleColor(role)}`}>
                  {getRoleDisplayName(role)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Role Legend */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="font-bold mb-3">Role Permissions:</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="bg-gray-700 p-3 rounded">
              <span className="font-bold text-purple-400">Super Administrator</span>
              <p className="text-gray-400">Highest privilege, can assign Admins, Owners, Editors</p>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <span className="font-bold text-red-400">Administrator</span>
              <p className="text-gray-400">Can assign Owners and Editors</p>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <span className="font-bold text-yellow-400">Owner</span>
              <p className="text-gray-400">Can only assign Editors</p>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <span className="font-bold text-green-400">Editor</span>
              <p className="text-gray-400">Can add/edit content</p>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <span className="font-bold text-blue-400">Viewer</span>
              <p className="text-gray-400">Read-only access</p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No users found that you can manage.</p>
              <p className="text-sm mt-2">Click "+ Add User" to create one.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">District</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Grade</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-700">
                    <td className="px-4 py-3 text-gray-300">
                      {user.email}
                      {user.id === currentUser?.id && (
                        <span className="ml-2 text-xs bg-blue-600 px-2 py-1 rounded">You</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canEditUser(user) ? (
                        <select
                          value={user.role}
                          onChange={(e) => updateUser(user.id, { role: e.target.value })}
                          className={`bg-gray-700 border rounded px-2 py-1 ${getRoleColor(user.role)}`}
                          disabled={!canEditUser(user)}
                        >
                          {getAvailableRoles().map((r) => (
                            <option key={r} value={r}>{getRoleDisplayName(r)}</option>
                          ))}
                          {!getAvailableRoles().includes(user.role) && (
                            <option value={user.role}>{getRoleDisplayName(user.role)}</option>
                          )}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded border ${getRoleColor(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={user.district || ""}
                        onChange={(e) => updateUser(user.id, { district: e.target.value })}
                        placeholder="Enter district"
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-32"
                        disabled={!canEditUser(user)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.assigned_subject || ""}
                        onChange={(e) => updateUser(user.id, { assigned_subject: e.target.value })}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
                        disabled={!canEditUser(user)}
                      >
                        <option value="">All</option>
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.assigned_grade || ""}
                        onChange={(e) => updateUser(user.id, { assigned_grade: e.target.value })}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
                        disabled={!canEditUser(user)}
                      >
                        <option value="">All</option>
                        {GRADES.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {canDeleteUser(user) && (
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  {getAvailableRoles().map((r) => (
                    <option key={r} value={r}>{getRoleDisplayName(r)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">District</label>
                <input
                  type="text"
                  value={newUserData.district}
                  onChange={(e) => setNewUserData({ ...newUserData, district: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="District name"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Subject (Optional)</label>
                <select
                  value={newUserData.assigned_subject}
                  onChange={(e) => setNewUserData({ ...newUserData, assigned_subject: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="">All</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Grade (Optional)</label>
                <select
                  value={newUserData.assigned_grade}
                  onChange={(e) => setNewUserData({ ...newUserData, assigned_grade: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="">All</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={addUser}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add User"}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}