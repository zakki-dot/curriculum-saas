"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type DashboardStats = {
  totalOwners: number;
  totalEditors: number;
  totalViewers: number;
  recentActivity: any[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserAndStats();
  }, []);

  const fetchUserAndStats = async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setCurrentUser(profile);

    // Fetch stats based on role
    if (profile?.role === "administrator") {
      await fetchAdminStats();
    } else if (profile?.role === "owner") {
      await fetchOwnerStats(profile);
    } else if (profile?.role === "editor") {
      router.push("/editor/dashboard");
    } else {
      router.push("/"); // Viewer goes to main curriculum view
    }

    setLoading(false);
  };

  const fetchAdminStats = async () => {
    // Count owners
    const { count: ownerCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "owner");

    // Count editors
    const { count: editorCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "editor");

    // Count viewers
    const { count: viewerCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "viewer");

    setStats({
      totalOwners: ownerCount || 0,
      totalEditors: editorCount || 0,
      totalViewers: viewerCount || 0,
      recentActivity: []
    });
  };

  const fetchOwnerStats = async (profile: any) => {
    // Count editors assigned to this owner's district
    const { count: editorCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "editor")
      .eq("district", profile.district);

    setStats({
      totalOwners: 0,
      totalEditors: editorCount || 0,
      totalViewers: 0,
      recentActivity: []
    });
  };

  const navigateToSegment = (segment: string) => {
    router.push(`/curriculum/${segment}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading dashboard...</p>
      </div>
    );
  }

  if (!currentUser || (currentUser.role !== "administrator" && currentUser.role !== "owner")) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p className="mt-2">You don't have permission to view this dashboard.</p>
        </div>
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
            <p className="text-gray-600 text-sm">
              Welcome back! Here's what's happening today.
            </p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Owners Card - Admin Only */}
          {currentUser.role === "administrator" && (
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-medium">Total Owners</h3>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-gray-800">{stats?.totalOwners}</p>
              <p className="text-green-600 text-sm mt-2">↑ Active in district</p>
            </div>
          )}

          {/* Editors Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm font-medium">
                {currentUser.role === "administrator" ? "Total Editors" : "Your Editors"}
              </h3>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-800">{stats?.totalEditors}</p>
            <p className="text-green-600 text-sm mt-2">↑ +12.5% from last month</p>
          </div>

          {/* Viewers Card - Admin Only */}
          {currentUser.role === "administrator" && (
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-medium">Viewers</h3>
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-gray-800">{stats?.totalViewers}</p>
              <p className="text-red-600 text-sm mt-2">↓ -4.2% from last month</p>
            </div>
          )}
        </div>

        {/* Content Areas / Grade Segments */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Content Areas</h2>
          <p className="text-gray-600 text-sm mb-4">Current scope and sequence across curriculum</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* K-5 Card */}
            {(currentUser.role === "administrator" || currentUser.assigned_grade === "K-5") && (
              <button
                onClick={() => navigateToSegment("k-5")}
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
                <p className="text-gray-600 text-sm mb-2">Unit 3: Ratios & Proportions</p>
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold">3 of 8 units</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: "37.5%" }}></div>
                  </div>
                </div>
                <p className="text-gray-500 text-xs">Week 12 of 36</p>
              </button>
            )}

            {/* 6-8 Card */}
            {(currentUser.role === "administrator" || currentUser.assigned_grade === "6-8") && (
              <button
                onClick={() => navigateToSegment("6-8")}
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
                <p className="text-gray-600 text-sm mb-2">Unit 2: Narrative Writing</p>
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold">2 of 6 units</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "33%" }}></div>
                  </div>
                </div>
                <p className="text-gray-500 text-xs">Week 8 of 36</p>
              </button>
            )}

            {/* 9-12 Card */}
            {(currentUser.role === "administrator" || currentUser.assigned_grade === "9-12") && (
              <button
                onClick={() => navigateToSegment("9-12")}
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
                <p className="text-gray-600 text-sm mb-2">Unit 4: Energy & Motion</p>
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold">4 of 7 units</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: "57%" }}></div>
                  </div>
                </div>
                <p className="text-gray-500 text-xs">Week 16 of 36</p>
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions for Admin */}
        {currentUser.role === "administrator" && (
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => router.push("/admin/users")}
                className="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition"
              >
                Manage Roles
              </button>
              <button
                onClick={() => router.push("/admin")}
                className="bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition"
              >
                Upload CSV
              </button>
              <button
                onClick={() => router.push("/admin")}
                className="bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition"
              >
                Add Curriculum
              </button>
              <button
                onClick={() => router.push("/")}
                className="bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition"
              >
                View as Viewer
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}