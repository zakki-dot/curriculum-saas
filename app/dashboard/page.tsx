
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  email: string;
  role: string;
  district: string | null;
  assigned_subject: string | null;
  assigned_grade: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    ownersInDistrict: 0,
    editorsInDistrict: 0,
    viewersInDistrict: 0,
    totalEditors: 0,
    totalOwners: 0,
    totalViewers: 0
  });
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Get user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      if (profileData) {
        await fetchStats(profileData);
      }

      setLoading(false);
    };

    initialize();
  }, [router]);

  const fetchStats = async (userProfile: Profile) => {
    try {
      // Accept both "admin" and "administrator"
      const isAdmin = userProfile.role === "administrator" || userProfile.role === "admin";
      
      if (isAdmin) {
        // Admin sees all users in their district
        if (userProfile.district) {
          const { data: districtUsers } = await supabase
            .from("profiles")
            .select("role")
            .eq("district", userProfile.district);

          const owners = districtUsers?.filter(u => u.role === "owner").length || 0;
          const editors = districtUsers?.filter(u => u.role === "editor").length || 0;
          const viewers = districtUsers?.filter(u => u.role === "viewer").length || 0;
          const total = districtUsers?.length || 0;

          setStats({
            totalUsers: total,
            ownersInDistrict: owners,
            editorsInDistrict: editors,
            viewersInDistrict: viewers,
            totalEditors: editors,
            totalOwners: owners,
            totalViewers: viewers
          });
        }
      } else if (userProfile.role === "owner" && userProfile.district) {
        // Owner sees editors and viewers in their district
        const { data: districtUsers } = await supabase
          .from("profiles")
          .select("role")
          .eq("district", userProfile.district);

        const editors = districtUsers?.filter(u => u.role === "editor").length || 0;
        const viewers = districtUsers?.filter(u => u.role === "viewer").length || 0;
        const total = districtUsers?.length || 0;

        setStats({
          totalUsers: total,
          ownersInDistrict: 0,
          editorsInDistrict: editors,
          viewersInDistrict: viewers,
          totalEditors: editors,
          totalOwners: 0,
          totalViewers: viewers
        });
      } else {
        // Viewer sees only their own stats
        setStats({
          totalUsers: 1,
          ownersInDistrict: 0,
          editorsInDistrict: 0,
          viewersInDistrict: 0,
          totalEditors: 0,
          totalOwners: 0,
          totalViewers: 0
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-purple-100 flex items-center justify-center">
        <p className="text-gray-800">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-purple-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600 text-sm mt-1">
              Welcome back, {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-6">
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Your Account Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm font-medium">Your Account</h3>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-800">{user?.email}</p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold capitalize">{profile?.role}</span>
              {profile?.district && <span> • {profile.district}</span>}
            </p>
            <p className="text-green-600 text-sm mt-2">✓ Active</p>
          </div>

          {/* Curriculum Access Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm font-medium">Curriculum Access</h3>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-800">All</p>
            <p className="text-green-600 text-sm mt-2">Full access granted</p>
          </div>

          {/* Status Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm font-medium">Status</h3>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-800">Active</p>
            <p className="text-gray-600 text-sm mt-2">Logged in</p>
          </div>
        </div>

        {/* User Statistics - Only for Administrators and Owners */}
        {(profile?.role === "administrator" || profile?.role === "admin" || profile?.role === "owner") && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-medium">Total Users</h3>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-gray-800">{stats.totalUsers}</p>
              <p className="text-gray-600 text-sm mt-2">In {profile.district || "your district"}</p>
            </div>

            {(profile?.role === "administrator" || profile?.role === "admin") && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 text-sm font-medium"># of Owners</h3>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-800">{stats.ownersInDistrict}</p>
                <p className="text-gray-600 text-sm mt-2">In {profile.district || "your district"}</p>
              </div>
            )}

            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-medium"># of Editors</h3>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-gray-800">{stats.editorsInDistrict}</p>
              <p className="text-gray-600 text-sm mt-2">In {profile.district || "your district"}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-medium"># of Viewers</h3>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-gray-800">{stats.viewersInDistrict}</p>
              <p className="text-gray-600 text-sm mt-2">In {profile.district || "your district"}</p>
            </div>
          </div>
        )}

        {/* Browse Curriculum */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Browse Curriculum</h2>
          <p className="text-gray-600 text-sm mb-4">Select a grade level to view curriculum</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => router.push("/?grade=K-5")}
              className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
            >
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 p-3 rounded-lg mr-4">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Grade K-5</p>
                  <h3 className="text-xl font-bold text-gray-800">Elementary</h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm">View elementary curriculum materials</p>
            </button>

            <button
              onClick={() => router.push("/?grade=6-8")}
              className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
            >
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Grade 6-8</p>
                  <h3 className="text-xl font-bold text-gray-800">Middle School</h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm">View middle school curriculum materials</p>
            </button>

            <button
              onClick={() => router.push("/?grade=9-12")}
              className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
            >
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-3 rounded-lg mr-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Grade 9-12</p>
                  <h3 className="text-xl font-bold text-gray-800">High School</h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm">View high school curriculum materials</p>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push("/")}
              className="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition"
            >
              View Curriculum
            </button>
            {(profile?.role === "administrator" || profile?.role === "admin" || profile?.role === "owner") && (
              <button
                onClick={() => router.push("/admin/users")}
                className="bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition"
              >
                Manage Users
              </button>
            )}
            {(profile?.role === "administrator" || profile?.role === "admin") && (
              <button
                onClick={() => router.push("/admin")}
                className="bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition"
              >
                Admin Panel
              </button>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}