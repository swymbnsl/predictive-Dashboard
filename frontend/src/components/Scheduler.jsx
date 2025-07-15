import React from 'react';

const Scheduler = () => (
  <section className="section" id="scheduler">
    <h2>🛠 Maintenance Scheduler (Auto-Prioritized)</h2>
    <p>🧠 Based on detected fault frequency & sensor values:</p>
    <ul>
      <li>🔧 Lubricate Bearings &rarr; <b>Urgent</b> (3 Bearing Faults today)</li>
      <li>🔧 Realign Shaft &rarr; <b>Medium</b> (2 Misalignments today)</li>
      <li>🔧 Vibration Check &rarr; <b>Next Week</b> (1 Imbalance flagged)</li>
    </ul>
    <b>📅 Next Planned Maintenance:</b>
    <ul>
      <li>2024-07-20 &rarr; Bearing Check</li>
      <li>2024-07-22 &rarr; Shaft Alignment</li>
    </ul>
    <button className="button">📧 Export Task List as PDF</button>
  </section>
);

export default Scheduler;