import React from 'react';

const WhatIfSimulator = () => (
  <section className="section" id="simulator">
    <h2>🔮 Predictive Maintenance Simulator</h2>
    <p>🤔 What if:</p>
    <ul>
      <li>Flow Rate drops below 150 LPM?</li>
      <li>Temp exceeds 80°C?</li>
      <li>Vibration Z spikes above 3.5 mm/s?</li>
    </ul>
    <p>📈 Model predicts:</p>
    <ul>
      <li>High risk of Imbalance or Overheating Fault</li>
      <li>Torque instability likely</li>
    </ul>
    <b>🔧 Recommended:</b>
    <ul>
      <li>Reduce load immediately</li>
      <li>Inspect motor bearings within 2 hours</li>
    </ul>
  </section>
);

export default WhatIfSimulator;