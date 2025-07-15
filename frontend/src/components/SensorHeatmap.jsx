import React from 'react';

const SensorHeatmap = () => (
  <section className="section" id="heatmap">
    <h2>📊 Sensor Health Heatmap</h2>
    <p>Columns Monitored: Torque, Vibration (X/Y/Z), Temp, Pressure, Flow Rate</p>
    <ul>
      <li>Vibration Z [mm/s] &rarr; <span style={{ color: 'red' }}>🔴 High (&gt;3.0 mm/s)</span> → Possible Bearing Fault</li>
      <li>Torque [Nm] &rarr; <span style={{ color: 'orange' }}>🟡 Fluctuating (&gt;50)</span> → Check load balancing</li>
      <li>Pressure [bar] &rarr; <span style={{ color: 'green' }}>🟢 Normal</span></li>
      <li>Temp [°C] &rarr; <span style={{ color: 'orange' }}>🟡 Slightly high (75°C)</span></li>
    </ul>
    <p>📉 Click any sensor → <b>🔍 View Detailed Timeline</b></p>
  </section>
);

export default SensorHeatmap;