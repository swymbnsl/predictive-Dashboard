import React, { useEffect, useState, useRef } from "react";

const MAINTENANCE_SUGGESTIONS = {
  "Bearing Fault": "Inspect and lubricate bearings",
  "Misalignment": "Realign motor-pump coupling",
  "Imbalance": "Recalibrate impeller",
  "Cavitation": "Check for pump cavitation and inspect impeller",
  "Normal": "No action needed, system normal"
};

const FaultSummary = () => {
  const [summary, setSummary] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const reportRef = useRef();

  const loadSummary = () => {
    try {
      const stored = localStorage.getItem("prediction_summary");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSummary(parsed);
        setLastUpdated(new Date().toLocaleString());
      }
    } catch (err) {
      console.error("Failed to parse summary:", err);
      setSummary(null);
    }
  };

  useEffect(() => {
    loadSummary();
    window.addEventListener("storage", loadSummary);
    return () => window.removeEventListener("storage", loadSummary);
  }, []);

  if (!summary) {
    return (
      <section className="section" id="summary">
        <h2>Fault Summary Report</h2>
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 bg-white/80 rounded-xl shadow-lg border border-blue-100">
          <span className="text-5xl mb-4">📂</span>
          <p className="text-lg text-gray-500 font-semibold mb-2">No summary to display</p>
          <p className="text-gray-400">Please upload and analyze a file to see the summary report.</p>
        </div>
      </section>
    );
  }

  const { total_records = 0, fault_counts = {} } = summary;

  const scrollToSchedule = () => {
    localStorage.setItem("fault_counts", JSON.stringify(fault_counts));
    window.location.hash = "#scheduler";
  };

  const ALL_FAULTS = ['Bearing Fault', 'Cavitation', 'Imbalance', 'Misalignment', 'Normal'];

  return (
    <section className="section" id="summary">
      <div ref={reportRef} style={{ flex: 1 }}>
        <h2>Fault Summary Report</h2>
        <p>ML Analysis Completed (Total Records: {total_records})</p>

        <div className="divider" />

        <div className="processing">📊 Faults Detected:</div>
        <ul>
          {ALL_FAULTS.map(fault => (
            <li key={fault}>
              {fault} → {fault_counts[fault] || 0} instance{(fault_counts[fault] || 0) !== 1 ? "s" : ""}
            </li>
          ))}
        </ul>

        <div className="divider" />

        <div className="processing">🛠 Maintenance Suggestions:</div>
        <ul>
          {ALL_FAULTS.filter(fault => fault_counts[fault] > 0).map(fault =>
            MAINTENANCE_SUGGESTIONS[fault] ? (
              <li key={fault}>✔ {fault} → {MAINTENANCE_SUGGESTIONS[fault]}</li>
            ) : null
          )}
          {fault_counts["Normal"] === total_records && (
            <li>✔ All systems normal. No immediate maintenance needed.</li>
          )}
        </ul>

        <p>
          <i>📅 Last updated: {lastUpdated}</i>
        </p>
      </div>

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <button className="button" onClick={scrollToSchedule}>
          🔧 View Schedule
        </button>
      </div>
    </section>
  );
};

export default FaultSummary;
