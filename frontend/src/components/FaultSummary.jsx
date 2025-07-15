import React from 'react';

const FaultSummary = () => (
  <section className="section" id="summary">
    <h2>🔍 Fault Summary Report</h2>
    <p>🧠 ML Analysis Completed (Total Records: 5000)</p>
    <b>🛑 Faults Detected:</b>
    <ul>
      <li>Bearing Fault &rarr; 34 instances</li>
      <li>Misalignment &rarr; 27 instances</li>
      <li>Imbalance &rarr; 14 instances</li>
      <li>Normal Operation &rarr; 4925 instances</li>
    </ul>
    <b>🛠 Maintenance Suggestion:</b>
    <ul>
      <li>✔ Bearing Fault &rarr; Inspect and lubricate bearings</li>
      <li>✔ Misalignment &rarr; Realign motor-pump coupling</li>
      <li>✔ Imbalance &rarr; Recalibrate impeller</li>
    </ul>
    <button className="button">🔧 View Schedule</button>
  </section>
);

export default FaultSummary;