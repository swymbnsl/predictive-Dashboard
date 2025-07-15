import React from 'react';

const FaultTrends = () => (
  <section className="section" id="trend">
    <h2>📈 Fault Trend Over Time</h2>
    <p>🗓 View how different faults occurred over time:</p>
    <div style={{ margin: '1rem 0' }}>
      <input type="date" /> to <input type="date" />
      <select style={{ marginLeft: 16 }}>
        <option>Hourly</option>
        <option>Daily</option>
        <option>Weekly</option>
      </select>
    </div>
    <div style={{ height: 220, background: '#e3e6f3', borderRadius: 8, margin: '1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span>📊 [ Chart with timestamps vs fault count | Color-coded by Fault Type ]</span>
    </div>
    <p>💡 Hovering over a spike shows:</p>
    <ul>
      <li>Fault: Misalignment</li>
      <li>Time: 2024-01-04 02:00</li>
      <li>Torque: 51.7 Nm</li>
      <li>Vibration Z: 3.1 mm/s</li>
    </ul>
    <button className="button">⬇ Export Graph Report (PDF)</button>
  </section>
);

export default FaultTrends;