"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  email: string;
  role: string;
  district: string | null;
  assigned_subject: string | null;
  assigned_grade: string | null;
};

const ROLES = ["viewer", "editor", "owner", "administrator"];
const SUBJECTS = ["ELA", "Math", "Science", "Social Studies", "SLA"];
const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8"];

export default function UsersAdminPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(data);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const updateUser = async (userId: string, updates: Partial<Profile>) => {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      setMessage(`❌ Error: ${error.message}`);
    } else {
      setMessage("✅ User updated successfully!");
      fetchUsers();
    }
  };

  // Check if current user is admin
  if (currentUser && currentUser.role !== "administrator") {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p className="text-gray-400 mt-2">
            Only Administrators can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold">User & Role Management</h1>
        <p className="text-gray-400 text-sm">
          Assign roles to users (Administrator only)
        </p>
      </header>

      <main className="p-6">
        {message && (
          <div className={`p-3 rounded mb-4 ${
            message.includes("✅") ? "bg-green-800" : "bg-red-800"
          }`}>
            {message}
          </div>
        )}

        {/* Role Legend */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="font-bold mb-3">Role Permissions:</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-700 p-3 rounded">
              <span className="font-bold text-blue-400">Viewer</span>
              <p className="text-gray-400">Browse curriculum (read-only)</p>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <span className="font-bold text-green-400">Editor</span>
              <p className="text-gray-400">Add/edit assigned areas only</p>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <span className="font-bold text-yellow-400">Owner</span>
              <p className="text-gray-400">Edit all + oversee district</p>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <span className="font-bold text-red-400">Administrator</span>
              <p className="text-gray-400">Full control + manage roles</p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">District</th>
                  <th className="px-4 py-3 text-left">Assigned Subject</th>
                  <th className="px-4 py-3 text-left">Assigned Grade</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-700">
                    <td className="px-4 py-3 text-gray-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => updateUser(user.id, { role: e.target.value })}
                        className={`bg-gray-700 border rounded px-2 py-1 ${
                          user.role === "administrator" ? "border-red-500" :
                          user.role === "owner" ? "border-yellow-500" :
                          user.role === "editor" ? "border-green-500" :
                          "border-gray-600"
                        }`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={user.district || ""}
                        onChange={(e) => updateUser(user.id, { district: e.target.value })}
                        placeholder="Enter district"
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-32"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.assigned_subject || ""}
                        onChange={(e) => updateUser(user.id, { assigned_subject: e.target.value })}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
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
                      >
                        <option value="">All</option>
                        {GRADES.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}