"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

// Column definitions
const ALL_COLUMNS = [
  "Quarter", "Grade", "Subject", "Curriculum", "Unit", "Week", "Date",
  "Scope (link)", "Assessment Name", "Assessment Link", "Standards",
  "Learning Targets", "Success Criteria", "Theme", "Title", "FQ",
  "Class", "Task", "Choice Text", "Required Text"
];

const columnToKey: Record<string, string> = {
  "Quarter": "quarter", "Grade": "grade", "Subject": "subject",
  "Curriculum": "curriculum", "Unit": "unit", "Week": "week",
  "Date": "date", "Scope (link)": "scope_link",
  "Assessment Name": "assessment_name", "Assessment Link": "assessment_link",
  "Standards": "standards", "Learning Targets": "learning_targets",
  "Success Criteria": "success_criteria", "Theme": "theme",
  "Title": "title", "FQ": "fq", "Class": "class_name",
  "Task": "task", "Choice Text": "choice_text", "Required Text": "required_text"
};

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("view");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Table view state
  const [entries, setEntries] = useState<any[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

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

  // Load entries on mount
  useEffect(() => {
    if (activeTab === "view") {
      loadEntries();
    }
  }, [activeTab]);

  // Filter entries based on search
  useEffect(() => {
    if (searchTerm) {
      const filtered = entries.filter(entry => 
        Object.values(entry).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries(entries);
    }
    setCurrentPage(1);
  }, [searchTerm, entries]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/curriculum");
      const result = await response.json();
      if (result.success) {
        setEntries(result.data || []);
        setFilteredEntries(result.data || []);
      }
    } catch (err: any) {
      setMessage(`❌ Error loading data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleColumn = (column: string) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== column));
      const newFormData = { ...formData };
      delete newFormData[columnToKey[column]];
      setFormData(newFormData);
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleManualSubmit = async () => {
    if (selectedColumns.length === 0) {
      setMessage("Please select at least one column first.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/manual-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save entry");

      setMessage("✅ Entry added successfully!");
      setFormData({});
      setSelectedColumns([]);
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return;

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    setCsvHeaders(headers);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        const key = columnToKey[header] || header.toLowerCase().replace(/\s+/g, "_");
        row[key] = values[index] || "";
      });
      rows.push(row);
    }
    setCsvData(rows);
    setMessage(`✅ Parsed ${rows.length} rows from CSV. Review and click Import.`);
  };

  const handleCSVImport = async () => {
    if (csvData.length === 0) {
      setMessage("No CSV data to import.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: csvData }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");

      setMessage(`✅ Successfully imported ${result.count} rows!`);
      setCsvData([]);
      setCsvHeaders([]);
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (entry: any) => {
    setEditingEntry(entry);
    setEditForm({ ...entry });
    setShowEditModal(true);
  };

  const handleEditChange = (key: string, value: string) => {
    setEditForm({ ...editForm, [key]: value });
  };

  const saveEdit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/curriculum/${editingEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Update failed");

      setMessage("✅ Entry updated successfully!");
      setShowEditModal(false);
      await loadEntries();
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/curriculum/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Delete failed");

      setMessage("✅ Entry deleted successfully!");
      await loadEntries();
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEntries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-gray-400 text-sm">Curriculum Management System</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/admin/users")}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Manage Users
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800 px-6 border-b border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("view")}
            className={`py-3 px-6 font-semibold transition ${
              activeTab === "view"
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            View & Edit
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`py-3 px-6 font-semibold transition ${
              activeTab === "manual"
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab("csv")}
            className={`py-3 px-6 font-semibold transition ${
              activeTab === "csv"
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            CSV Upload
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="p-6">
        {message && (
          <div
            className={`mb-4 p-4 rounded ${
              message.includes("✅") ? "bg-green-800" : "bg-red-800"
            }`}
          >
            {message}
          </div>
        )}

        {/* VIEW TAB */}
        {activeTab === "view" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Curriculum Entries</h2>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-4 py-2 w-64"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : currentItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No entries found. Add some data using Manual Entry or CSV Upload.
              </div>
            ) : (
              <>
                <div className="bg-gray-800 rounded-lg overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left">Quarter</th>
                        <th className="px-4 py-3 text-left">Grade</th>
                        <th className="px-4 py-3 text-left">Subject</th>
                        <th className="px-4 py-3 text-left">Unit</th>
                        <th className="px-4 py-3 text-left">Week</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((entry) => (
                        <tr key={entry.id} className="border-t border-gray-700 hover:bg-gray-750">
                          <td className="px-4 py-3">{entry.quarter || "-"}</td>
                          <td className="px-4 py-3">{entry.grade || "-"}</td>
                          <td className="px-4 py-3">{entry.subject || "-"}</td>
                          <td className="px-4 py-3">{entry.unit || "-"}</td>
                          <td className="px-4 py-3">{entry.week || "-"}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openEditModal(entry)}
                              className="text-blue-400 hover:text-blue-300 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                  <p className="text-gray-400">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredEntries.length)} of {filteredEntries.length} entries
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="bg-gray-800 px-4 py-2 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="bg-gray-800 px-4 py-2 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* MANUAL ENTRY TAB */}
        {activeTab === "manual" && (
          <div>
            <h2 className="text-xl font-bold mb-6">Manual Entry</h2>
            
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
              <h3 className="font-semibold mb-4">Select Columns to Fill</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ALL_COLUMNS.map((col) => (
                  <label key={col} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col)}
                      onChange={() => toggleColumn(col)}
                      className="w-4 h-4"
                    />
                    <span>{col}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedColumns.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="font-semibold mb-4">Fill Data</h3>
                <div className="grid gap-4">
                  {selectedColumns.map((col) => (
                    <div key={col}>
                      <label className="block mb-1 text-sm">{col}</label>
                      <input
                        type="text"
                        value={formData[columnToKey[col]] || ""}
                        onChange={(e) => handleInputChange(columnToKey[col], e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleManualSubmit}
                  disabled={isLoading}
                  className="mt-6 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Entry"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* CSV UPLOAD TAB */}
        {activeTab === "csv" && (
          <div>
            <h2 className="text-xl font-bold mb-6">CSV Upload</h2>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="mb-6">
                <label className="block mb-2 font-semibold">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="bg-gray-700 border border-gray-600 rounded px-4 py-2 w-full"
                />
              </div>

              {csvData.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Preview ({csvData.length} rows)</h3>
                  <div className="bg-gray-700 p-4 rounded mb-4 max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          {csvHeaders.map((header) => (
                            <th key={header} className="px-2 py-2 text-left">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-600">
                            {csvHeaders.map((header) => (
                              <td key={header} className="px-2 py-2">
                                {row[columnToKey[header]] || row[header.toLowerCase().replace(/\s+/g, "_")] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 5 && (
                      <p className="text-gray-400 text-center mt-4">
                        Showing first 5 rows. {csvData.length - 5} more rows will be imported.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleCSVImport}
                    disabled={isLoading}
                    className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {isLoading ? "Importing..." : "Import CSV Data"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Entry</h2>
            
            <div className="grid gap-4">
              {ALL_COLUMNS.map((col) => (
                <div key={col}>
                  <label className="block mb-1 text-sm">{col}</label>
                  <input
                    type="text"
                    value={editForm[columnToKey[col]] || ""}
                    onChange={(e) => handleEditChange(columnToKey[col], e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={saveEdit}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
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