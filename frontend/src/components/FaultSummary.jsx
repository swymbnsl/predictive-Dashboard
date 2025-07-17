import React, { useEffect, useState, useRef } from "react";

const MAINTENANCE_SUGGESTIONS = {
  "Bearing Fault": "Inspect and lubricate bearings",
  "Misalignment": "Realign motor-pump coupling",
  "Imbalance": "Recalibrate impeller",
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
        <p>No prediction summary found. Please upload a file first.</p>
      </section>
    );
  }

  const { total_records = 0, fault_counts = {} } = summary;

  const scrollToSchedule = () => {
    localStorage.setItem("fault_counts", JSON.stringify(fault_counts));
    window.location.hash = "#scheduler";
  };

  return (
    <section className="section" id="summary">
      <div ref={reportRef} style={{ flex: 1 }}>
        <h2>Fault Summary Report</h2>
        <p>ML Analysis Completed (Total Records: {total_records})</p>

        <div className="divider" />

        <div className="processing">📊 Faults Detected:</div>
        <ul>
          {Object.entries(fault_counts).map(([fault, count]) => (
            <li key={fault}>
              {fault} → {count} instance{count !== 1 ? "s" : ""}
            </li>
          ))}
        </ul>

        <div className="divider" />

        <div className="processing">🛠 Maintenance Suggestions:</div>
        <ul>
          {Object.entries(MAINTENANCE_SUGGESTIONS).map(([fault, suggestion]) =>
            fault_counts[fault] > 0 ? (
              <li key={fault}>
                ✔ {fault} → {suggestion}
              </li>
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
