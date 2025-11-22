"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// All available columns that match your Google Sheet
const ALL_COLUMNS = [
  "Quarter",
  "Grade", 
  "Subject",
  "Curriculum",
  "Unit",
  "Week",
  "Date",
  "Scope (link)",
  "Assessment Name",
  "Assessment Link",
  "Standards",
  "Learning Targets",
  "Success Criteria",
  "Theme",
  "Title",
  "FQ",
  "Class",
  "Task",
  "Choice Text",
  "Required Text",
];

// Map display names to database-friendly keys
const columnToKey: Record<string, string> = {
  "Quarter": "quarter",
  "Grade": "grade",
  "Subject": "subject",
  "Curriculum": "curriculum",
  "Unit": "unit",
  "Week": "week",
  "Date": "date",
  "Scope (link)": "scope_link",
  "Assessment Name": "assessment_name",
  "Assessment Link": "assessment_link",
  "Standards": "standards",
  "Learning Targets": "learning_targets",
  "Success Criteria": "success_criteria",
  "Theme": "theme",
  "Title": "title",
  "FQ": "fq",
  "Class": "class_name",
  "Task": "task",
  "Choice Text": "choice_text",
  "Required Text": "required_text",
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"manual" | "csv">("manual");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Toggle column selection
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

  // Handle form input change
  const handleInputChange = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  // Handle manual form submission
  const handleManualSubmit = async () => {
    if (selectedColumns.length === 0) {
      setMessage("Please select at least one column first.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      // Insert into curriculum_entries table (flat structure for simplicity)
      const { error } = await supabase
        .from("curriculum_entries")
        .insert([formData]);

      if (error) throw error;

      setMessage("✅ Entry added successfully!");
      setFormData({});
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CSV file upload
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

  // Parse CSV text into data
  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return;

    // First line is headers
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    setCsvHeaders(headers);

    // Rest are data rows
    const rows: Record<string, string>[] = [];
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
    setMessage(`✅ Parsed ${rows.length} rows from CSV. Review below and click Import.`);
  };

  // Import CSV data to Supabase
  const handleCSVImport = async () => {
    if (csvData.length === 0) {
      setMessage("No CSV data to import.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("curriculum_entries")
        .insert(csvData);

      if (error) throw error;

      setMessage(`✅ Successfully imported ${csvData.length} rows!`);
      setCsvData([]);
      setCsvHeaders([]);
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold">Admin: Add Curriculum Data</h1>
        <p className="text-gray-400 text-sm mt-1">
          Choose to add data manually or upload a CSV file
        </p>
      </header>

      {/* Tab Switcher */}
      <div className="px-6 py-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("manual")}
          className={`px-4 py-2 mr-2 rounded ${
            activeTab === "manual"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setActiveTab("csv")}
          className={`px-4 py-2 rounded ${
            activeTab === "csv"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
        >
          Upload CSV
        </button>
      </div>

      <main className="p-6">
        {/* Status Message */}
        {message && (
          <div className={`p-3 rounded mb-4 ${
            message.includes("✅") ? "bg-green-800" : "bg-red-800"
          }`}>
            {message}
          </div>
        )}

        {/* MANUAL ENTRY TAB */}
        {activeTab === "manual" && (
          <div className="flex gap-6">
            {/* Left: Column Selector */}
            <div className="w-64 bg-gray-800 p-4 rounded-lg">
              <h2 className="font-bold mb-3 text-lg">Select Columns</h2>
              <p className="text-gray-400 text-xs mb-4">
                Click + to add fields to your form
              </p>
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
                  <span className="text-lg">
                    {selectedColumns.includes(col) ? "−" : "+"}
                  </span>
                </button>
              ))}
            </div>

            {/* Right: Form Fields */}
            <div className="flex-1 bg-gray-800 p-6 rounded-lg">
              <h2 className="font-bold mb-4 text-lg">Entry Form</h2>
              {selectedColumns.length === 0 ? (
                <p className="text-gray-400">
                  Select columns from the left to build your form.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {selectedColumns.map((col) => {
                    const key = columnToKey[col];
                    return (
                      <div key={col}>
                        <label className="block text-sm text-gray-300 mb-1">
                          {col}
                        </label>
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
              Your CSV should have headers matching: Quarter, Grade, Subject,
              Curriculum, Unit, Week, Date, etc.
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="mb-4 text-gray-300"
            />

            {/* CSV Preview Table */}
            {csvData.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">
                  Preview ({csvData.length} rows)
                </h3>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        {csvHeaders.map((h) => (
                          <th key={h} className="px-3 py-2 text-left">
                            {h}
                          </th>
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
    </div>
  );
}