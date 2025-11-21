"use client";

import { useState } from "react";

// Sample curriculum data (later this will come from Supabase)
const sampleData = [
  {
    id: 1,
    subject: "SLA",
    grade: "5",
    curriculum: "Benchmark-Adelante",
    quarter: "Q1",
    module: "Module 1",
    arcQuestion: "¿Cómo decidimos cuáles recursos debemos desarrollar?",
    assessments: ["End of Unit Assessment", "End of Unit Essay"],
    weekRange: "Week: 1-3 Sep 15 - Oct 9",
    coreTexts: "La estructura de una planta de maíz, El futuro de un cultivo, Breve historia de una planta especial, Plantas auxiliares, La cienca de cultivar maíz",
    learningTargets: "Benchmark Standards, LT, SC",
    standards: "RL.5.1, RL.5.2, RL.5.3, W.5.1, W.5.2",
    successCriteria: "Students can identify main idea and supporting details. Students can write an argumentative essay.",
  },
  {
    id: 2,
    subject: "SLA",
    grade: "4",
    curriculum: "Benchmark-Adelante",
    quarter: "Q1",
    module: "Module 1",
    arcQuestion: "¿Cómo respondemos a la naturaleza?",
    assessments: ["End of Unit Assessment", "End of Unit Essay"],
    weekRange: "Week: 1-3 Sept 15- Oct 9",
    coreTexts: "El almuerzo gratis para un pájaro, El caracol rosa, Verano entre glaciares, El manantial secreto",
    learningTargets: "Benchmark Standards, LT, SC",
    standards: "RL.4.1, RL.4.2, RL.4.3, W.4.1",
    successCriteria: "Students can analyze character development. Students can identify theme.",
  },
  {
    id: 3,
    subject: "SLA",
    grade: "3",
    curriculum: "Benchmark-Adelante",
    quarter: "Q1",
    module: "Module 1",
    arcQuestion: "¿Cómo sobreviven los seres vivos en su medioambiente?",
    assessments: ["End of Unit Assessment", "End of Unit Essay"],
    weekRange: "Week: 1-3 Sept 15 - Oct 9",
    coreTexts: "Los disfraces de los animales, Las herramientas de supervivencia de los animales, Pelajes, pieles, escamas o plumas, Un cuerpo, muchas adaptaciones",
    learningTargets: "Benchmark Standards, LT, SC",
    standards: "RL.3.1, RL.3.2, RI.3.1, W.3.2",
    successCriteria: "Students can identify cause and effect. Students can summarize informational text.",
  },
];

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

// Curriculum Card component
function CurriculumCard({ data }: { data: typeof sampleData[0] }) {
  return (
    <div className="flex bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Left colored sidebar */}
      <div className="w-36 bg-teal-700 text-white p-4 flex flex-col">
        <span className="text-xs uppercase tracking-wide">Subject</span>
        <span className="text-3xl font-bold">{data.subject}</span>
        <span className="text-5xl font-bold my-2">{data.grade}</span>
        <span className="text-sm">{data.curriculum}</span>
        <a href="#" className="text-cyan-300 text-xs mt-3 hover:underline">
          View Scope & Sequence &gt;
        </a>
      </div>

      {/* Middle content section */}
      <div className="flex-1 p-4">
        <div className="flex gap-8 mb-4">
          {/* Module info */}
          <div>
            <h3 className="font-bold text-gray-900">{data.module}</h3>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Arc Question:</span><br />
              {data.arcQuestion}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-semibold">Assessment:</span><br />
              {data.assessments.map((a, i) => (
                <a key={i} href="#" className="text-blue-600 hover:underline block">{a}</a>
              ))}
            </p>
          </div>

          {/* Week and Core Texts */}
          <div className="flex-1">
            <div className="bg-cyan-500 text-white px-3 py-1 rounded text-sm inline-block mb-2">
              {data.weekRange}
            </div>
            <div className="bg-gray-100 p-3 rounded">
              <h4 className="font-semibold text-gray-800 text-sm">K5 SLA Adelante Core Text(s)</h4>
              <p className="text-gray-700 text-sm">{data.coreTexts}</p>
            </div>

            {/* Learning Targets */}
            <div className="bg-gray-100 p-3 rounded mt-2">
              <h4 className="font-semibold text-gray-800 text-sm">SLA Adelante Learning Targets</h4>
              <a href="#" className="text-blue-600 text-sm hover:underline">{data.learningTargets}</a>
            </div>

            {/* Collapsible Standards */}
            <CollapsibleSection
              title="K5 SLA Adelante Standards"
              content={data.standards}
            />

            {/* Collapsible Success Criteria */}
            <CollapsibleSection
              title="K5 SLA Adelante Success Criteria"
              content={data.successCriteria}
            />
          </div>
        </div>
      </div>

      {/* Right quarter badge */}
      <div className="w-24 bg-cyan-400 flex items-center justify-center">
        <span className="text-5xl font-light text-white">{data.quarter}</span>
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

  // Filter the data based on selections
  const filteredData = sampleData.filter((item) => {
    if (quarter && item.quarter !== quarter) return false;
    if (grade && item.grade !== grade) return false;
    if (subject && item.subject !== subject) return false;
    if (curriculum && item.curriculum !== curriculum) return false;
    return true;
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
        <span>1 - {filteredData.length} / {sampleData.length}</span>
        <div className="flex gap-2">
          <button className="text-gray-400 hover:text-white">&lt;</button>
          <button className="text-gray-400 hover:text-white">&gt;</button>
        </div>
      </div>

      {/* Cards Container */}
      <main className="px-6 pb-8">
        {filteredData.length > 0 ? (
          filteredData.map((item) => (
            <CurriculumCard key={item.id} data={item} />
          ))
        ) : (
          <div className="text-center text-gray-400 py-10">
            No curriculum items match your filters.
          </div>
        )}
      </main>
    </div>
  );
}