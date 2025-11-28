"use client";

import { useState, useEffect } from "react";

// Column definitions
const ALL_COLUMNS = [
  "Quarter", "Grade", "Subject", "Curriculum", "Unit", "Week", "Date",
  "Scope (link)", "Assessment Name", "Assessment Link", "Standards",
  "Learning Targets", "Success Criteria", "Theme", "Title", "FQ",
  "Class", "Task", "Choice Text", "Required Text"
];

const columnToKey = {
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
  const [activeTab, setActiveTab] = useState("view");
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [formData, setFormData] = useState({});
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Table view state
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  // User role
  const [userRole, setUserRole] = useState(null);

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
    } catch (err) {
      setMessage(`❌ Error loading data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleColumn = (column) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== column));
      const newFormData = { ...formData };
      delete newFormData[columnToKey[column]];
      setFormData(newFormData);
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  const handleInputChange = (key, value) => {
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
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return;

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    setCsvHeaders(headers);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const row = {};
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
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setEditForm({ ...entry });
    setShowEditModal(true);
  };

  const handleEditChange = (key, value) => {
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
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEntry = async (id) => {
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
    } catch (err) {
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

  const displayColumns = ["quarter", "grade", "subject", "curriculum", "unit", "week", "title"];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Curriculum Administration</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage, view, and edit curriculum data
        </p>
      </header>

      {/* Tab Switcher */}
      <div className="px-6 py-4 border-b border-gray-700 flex gap-2">
        <button
          onClick={() => setActiveTab("view")}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            activeTab === "view"
              ? "bg-cyan-600 text-white shadow-lg"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          📊 View & Edit Data
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            activeTab === "manual"
              ? "bg-cyan-600 text-white shadow-lg"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          ✏️ Manual Entry
        </button>
        <button
          onClick={() => setActiveTab("csv")}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            activeTab === "csv"
              ? "bg-cyan-600 text-white shadow-lg"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          📂 Upload CSV
        </button>
      </div>

      <main className="p-6">
        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-4 ${
            message.includes("✅") ? "bg-green-800" : "bg-red-800"
          }`}>
            {message}
          </div>
        )}

        {/* VIEW & EDIT TAB */}
        {activeTab === "view" && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Curriculum Database</h2>
              <input
                type="text"
                placeholder="🔍 Search anything..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 w-80"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        {displayColumns.map((col) => (
                          <th key={col} className="px-4 py-3 text-left uppercase text-xs font-semibold">
                            {col.replace("_", " ")}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left uppercase text-xs font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-700 hover:bg-gray-750">
                          {displayColumns.map((col) => (
                            <td key={col} className="px-4 py-3">
                              {entry[col] || "-"}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditModal(entry)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-6">
                  <p className="text-gray-400 text-sm">
                    Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredEntries.length)} of {filteredEntries.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 bg-gray-700 rounded">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
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
          <div className="flex gap-6">
            <div className="w-64 bg-gray-800 p-4 rounded-lg">
              <h2 className="font-bold mb-3 text-lg">Select Columns</h2>
              <p className="text-gray-400 text-xs mb-4">Click + to add fields</p>
              {ALL_COLUMNS.map((col) => (
                <button
                  key={col}
                  onClick={() => toggleColumn(col)}
                  className={`w-full text-left px-3 py-2 mb-1 rounded flex items-center justify-between ${
                    selectedColumns.includes(col)
                      ? "bg-cyan-700 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <span className="text-sm">{col}</span>
                  <span className="text-lg">{selectedColumns.includes(col) ? "−" : "+"}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 bg-gray-800 p-6 rounded-lg">
              <h2 className="font-bold mb-4 text-lg">Entry Form</h2>
              {selectedColumns.length === 0 ? (
                <p className="text-gray-400">Select columns from the left to build your form.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {selectedColumns.map((col) => {
                    const key = columnToKey[col];
                    return (
                      <div key={col}>
                        <label className="block text-sm text-gray-300 mb-1">{col}</label>
                        <input
                          type="text"
                          value={formData[key] || ""}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                          placeholder={`Enter ${col}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedColumns.length > 0 && (
                <button
                  onClick={handleManualSubmit}
                  disabled={isLoading}
                  className="mt-6 bg-cyan-600 hover:bg-cyan-700 px-6 py-2 rounded font-semibold disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Entry"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* CSV UPLOAD TAB */}
        {activeTab === "csv" && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="font-bold mb-4 text-lg">Upload CSV File</h2>
            <p className="text-gray-400 text-sm mb-4">
              Your CSV should have headers matching: Quarter, Grade, Subject, Curriculum, etc.
            </p>

            <input type="file" accept=".csv" onChange={handleCSVUpload} className="mb-4 text-gray-300" />

            {csvData.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Preview ({csvData.length} rows)</h3>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        {csvHeaders.map((h) => (
                          <th key={h} className="px-3 py-2 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-gray-700">
                          {csvHeaders.map((h) => {
                            const key = columnToKey[h] || h.toLowerCase().replace(/\s+/g, "_");
                            return (
                              <td key={h} className="px-3 py-2 text-gray-300">
                                {row[key]?.substring(0, 50) || "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvData.length > 10 && (
                  <p className="text-gray-400 text-sm mt-2">
                    Showing first 10 rows of {csvData.length}...
                  </p>
                )}

                <button
                  onClick={handleCSVImport}
                  disabled={isLoading}
                  className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-semibold disabled:opacity-50"
                >
                  {isLoading ? "Importing..." : `Import ${csvData.length} Rows`}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6">
              <h2 className="text-2xl font-bold">Edit Entry</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(columnToKey).map((col) => {
                  const key = columnToKey[col];
                  if (key === "id" || key === "created_at") return null;
                  return (
                    <div key={key}>
                      <label className="block text-sm text-gray-300 mb-1">{col}</label>
                      <input
                        type="text"
                        value={editForm[key] || ""}
                        onChange={(e) => handleEditChange(key, e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}