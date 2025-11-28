"use client";

import { useState, useEffect } from "react";

// Collapsible section component
function CollapsibleSection({ title, content }: { title: string; content: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-100 p-3 rounded mb-2">
      <h4 className="font-semibold text-gray-800 text-sm">{title}</h4>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-cyan-500 text-white px-4 py-1 rounded text-sm font-bold mt-2 hover:bg-cyan-600 transition"
      >
        MORE
      </button>
      {isOpen ? (
        <p className="text-gray-700 text-sm mt-2">{content}</p>
      ) : (
        <p className="text-gray-600 text-sm mt-2">Click on the button to reveal standards</p>
      )}
    </div>
  );
}

// Curriculum Card component - updated to work with real database fields
function CurriculumCard({ data }: { data: any }) {
  return (
    <div className="flex bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Left colored sidebar */}
      <div className="w-36 bg-teal-700 text-white p-4 flex flex-col">
        <span className="text-xs uppercase tracking-wide">Subject</span>
        <span className="text-3xl font-bold">{data.subject || "N/A"}</span>
        <span className="text-5xl font-bold my-2">{data.grade || "N/A"}</span>
        <span className="text-sm">{data.curriculum || "N/A"}</span>
        {data.scope_link && (
          <a href={data.scope_link} target="_blank" rel="noopener noreferrer" className="text-cyan-300 text-xs mt-3 hover:underline">
            View Scope & Sequence &gt;
          </a>
        )}
      </div>

      {/* Middle content section */}
      <div className="flex-1 p-4">
        <div className="flex gap-8 mb-4">
          {/* Module info */}
          <div>
            <h3 className="font-bold text-gray-900">{data.unit || data.title || "Unit"}</h3>
            {data.fq && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Arc Question:</span><br />
                {data.fq}
              </p>
            )}
            {data.assessment_name && (
              <p className="text-sm text-gray-700 mt-2">
                <span className="font-semibold">Assessment:</span><br />
                {data.assessment_link ? (
                  <a href={data.assessment_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                    {data.assessment_name}
                  </a>
                ) : (
                  <span>{data.assessment_name}</span>
                )}
              </p>
            )}
            {data.theme && (
              <p className="text-sm text-gray-700 mt-2">
                <span className="font-semibold">Theme:</span> {data.theme}
              </p>
            )}
          </div>

          {/* Week and Core Texts */}
          <div className="flex-1">
            {data.week && data.date && (
              <div className="bg-cyan-500 text-white px-3 py-1 rounded text-sm inline-block mb-2">
                Week: {data.week} - {data.date}
              </div>
            )}
            
            {(data.required_text || data.choice_text) && (
              <div className="bg-gray-100 p-3 rounded mb-2">
                <h4 className="font-semibold text-gray-800 text-sm">Core Text(s)</h4>
                {data.required_text && (
                  <p className="text-gray-700 text-sm"><strong>Required:</strong> {data.required_text}</p>
                )}
                {data.choice_text && (
                  <p className="text-gray-700 text-sm mt-1"><strong>Choice:</strong> {data.choice_text}</p>
                )}
              </div>
            )}

            {/* Learning Targets */}
            {data.learning_targets && (
              <div className="bg-gray-100 p-3 rounded mt-2">
                <h4 className="font-semibold text-gray-800 text-sm">Learning Targets</h4>
                <p className="text-gray-700 text-sm">{data.learning_targets}</p>
              </div>
            )}

            {/* Collapsible Standards */}
            {data.standards && (
              <CollapsibleSection
                title="Standards"
                content={data.standards}
              />
            )}

            {/* Collapsible Success Criteria */}
            {data.success_criteria && (
              <CollapsibleSection
                title="Success Criteria"
                content={data.success_criteria}
              />
            )}

            {/* Task */}
            {data.task && (
              <div className="bg-gray-100 p-3 rounded mt-2">
                <h4 className="font-semibold text-gray-800 text-sm">Task</h4>
                <p className="text-gray-700 text-sm">{data.task}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right quarter badge */}
      <div className="w-24 bg-cyan-400 flex items-center justify-center">
        <span className="text-5xl font-light text-white">{data.quarter || "Q?"}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [quarter, setQuarter] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [week, setWeek] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // ✅ NEW: State for real data from database
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ NEW: Fetch curriculum data from API whenever filters change
  useEffect(() => {
    async function fetchCurriculum() {
      setLoading(true);
      setError("");
      
      try {
        const params = new URLSearchParams();
        if (quarter) params.append("quarter", quarter);
        if (grade) params.append("grade", grade);
        if (subject) params.append("subject", subject);
        if (curriculum) params.append("curriculum", curriculum);

        const response = await fetch(`/api/curriculum?${params.toString()}`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch curriculum");
        }

        if (result.success) {
          setData(result.data || []);
        }
      } catch (err: any) {
        console.error("Failed to fetch curriculum:", err);
        setError(err.message || "Failed to load curriculum data");
      } finally {
        setLoading(false);
      }
    }

    fetchCurriculum();
  }, [quarter, grade, subject, curriculum]); // Re-fetch when filters change

  // Filter by search term (client-side filtering on loaded data)
  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.title?.toLowerCase().includes(search) ||
      item.unit?.toLowerCase().includes(search) ||
      item.theme?.toLowerCase().includes(search) ||
      item.standards?.toLowerCase().includes(search) ||
      item.learning_targets?.toLowerCase().includes(search) ||
      item.task?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 text-white px-6 py-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
          <span className="text-gray-800 font-bold text-xs">LOGO</span>
        </div>
        <h1 className="text-xl font-semibold">Instructional Priorities Observation Dashboard</h1>
      </header>

      {/* Filter Bar */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 min-w-[120px]"
          >
            <option value="">Quarter</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>

          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 min-w-[120px]"
          >
            <option value="">Grade</option>
            <option value="K">K</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 min-w-[120px]"
          >
            <option value="">Subject</option>
            <option value="SLA">SLA</option>
            <option value="ELA">ELA</option>
            <option value="Math">Math</option>
          </select>

          <select
            value={curriculum}
            onChange={(e) => setCurriculum(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 min-w-[140px]"
          >
            <option value="">Curriculum</option>
            <option value="Benchmark-Adelante">Benchmark-Adelante</option>
            <option value="Fundations">Fundations</option>
          </select>

          <select
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 min-w-[120px]"
          >
            <option value="">Week</option>
            <option value="1">Week 1</option>
            <option value="2">Week 2</option>
            <option value="3">Week 3</option>
          </select>

          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 min-w-[150px]"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="px-6 py-3 text-gray-400 text-sm flex items-center justify-between">
        <span>
          {loading ? "Loading..." : `1 - ${filteredData.length} / ${data.length}`}
        </span>
        <div className="flex gap-2">
          <button className="text-gray-400 hover:text-white">&lt;</button>
          <button className="text-gray-400 hover:text-white">&gt;</button>
        </div>
      </div>

      {/* Cards Container */}
      <main className="px-6 pb-8">
        {error && (
          <div className="bg-red-800 text-white p-4 rounded mb-4">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-10">
            <div className="animate-pulse">Loading curriculum data...</div>
          </div>
        ) : filteredData.length > 0 ? (
          filteredData.map((item, index) => (
            <CurriculumCard key={item.id || index} data={item} />
          ))
        ) : (
          <div className="text-center text-gray-400 py-10">
            {data.length === 0 ? (
              <>
                <p className="text-lg mb-2">No curriculum data yet.</p>
                <p className="text-sm">Add some data from the Admin panel to get started!</p>
              </>
            ) : (
              "No curriculum items match your filters."
            )}
          </div>
        )}
      </main>
    </div>
  );
}