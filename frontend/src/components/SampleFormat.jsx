import React from 'react';

const SampleFormat = ({ onBack }) => (
  <section className="section">
    <h2>📂 Sample Format - Expected CSV Layout</h2>
    <p>📄 Your input CSV file should have the following columns:</p>
    <ul>
      <li>Pump_ID</li>
      <li>Vibration</li>
      <li>Flow_Rate</li>
      <li>Pressure</li>
      <li>Torque</li>
      <li>Temperature</li>
    </ul>
    <p>💡 Tip: Ensure no missing values and numeric entries only.</p>
    <button className="button" onClick={() => window.open('/assets/sample_format.csv', '_blank')}>
      ⬇ Download Sample Format File (.csv)
    </button>
    <button className="button" style={{ background: '#eee', color: '#222' }} onClick={onBack}>
      🔙 Back to Dashboard
    </button>
  </section>
);

export default SampleFormat;