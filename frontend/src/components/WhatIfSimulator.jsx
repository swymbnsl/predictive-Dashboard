import React, { useState } from 'react';

const SENSOR_DEFAULTS = {
  'Flow_Rate_LPM': 200,
  'Temperature_C': 70,
  'Vibration_Z_mm_s': 2.0,
  'Torque_Nm': 40,
  'Pressure_bar': 5,
  'Rotational_Speed_RPM': 1500,
  'Vibration_X_mm_s': 2.0,
  'Vibration_Y_mm_s': 2.0,
};

const SENSOR_INFO = {
  'Flow_Rate_LPM': { label: 'Flow Rate (LPM)', normal: [150, 300], tip: 'Low flow can indicate blockage or pump issues.' },
  'Temperature_C': { label: 'Temperature (°C)', normal: [40, 80], tip: 'High temp may indicate overheating or friction.' },
  'Vibration_Z_mm_s': { label: 'Vibration Z (mm/s)', normal: [0, 3.5], tip: 'High vibration is a sign of imbalance or bearing fault.' },
  'Torque_Nm': { label: 'Torque (Nm)', normal: [20, 60], tip: 'Torque instability can indicate load or alignment issues.' },
  'Pressure_bar': { label: 'Pressure (bar)', normal: [2, 8], tip: 'Low/high pressure can indicate leaks or blockages.' },
  'Rotational_Speed_RPM': { label: 'Speed (RPM)', normal: [1200, 1800], tip: 'Speed outside normal range may indicate control issues.' },
  'Vibration_X_mm_s': { label: 'Vibration X (mm/s)', normal: [0, 3.5], tip: 'Monitor for lateral vibration.' },
  'Vibration_Y_mm_s': { label: 'Vibration Y (mm/s)', normal: [0, 3.5], tip: 'Monitor for lateral vibration.' },
};

const FAULT_RECOMMENDATIONS = {
  'Bearing Fault': 'Inspect and lubricate bearings immediately. Monitor vibration and temperature.',
  'Imbalance': 'Check for unbalanced load or misaligned components.',
  'Misalignment': 'Realign motor-pump coupling and check for wear.',
  'Cavitation': 'Check for pump cavitation, inspect impeller and flow.',
  'Normal': 'No action needed. System is healthy.',
};

const WhatIfSimulator = () => {
  const [inputs, setInputs] = useState({ ...SENSOR_DEFAULTS });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleChange = (key, value) => {
    setInputs({ ...inputs, [key]: value });
  };

  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);
    // Build a fake CSV row for backend
    const headers = [
      'Timestamp',
      'Rotational_Speed_RPM',
      'Torque_Nm',
      'Vibration_X_mm_s',
      'Vibration_Y_mm_s',
      'Vibration_Z_mm_s',
      'Temperature_C',
      'Pressure_bar',
      'Flow_Rate_LPM',
    ];
    const now = new Date().toISOString();
    const row = [
      now,
      inputs.Rotational_Speed_RPM,
      inputs.Torque_Nm,
      inputs.Vibration_X_mm_s,
      inputs.Vibration_Y_mm_s,
      inputs.Vibration_Z_mm_s,
      inputs.Temperature_C,
      inputs.Pressure_bar,
      inputs.Flow_Rate_LPM,
    ];
    const csv = `${headers.join(',')}
${row.join(',')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'simulator.csv');
    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data && data.trend_data && data.trend_data.length > 0) {
        setResult(data.trend_data[0]);
        setHistory(prev => [data.trend_data[0], ...prev].slice(0, 5));
      } else {
        setResult({ error: 'No prediction returned.' });
      }
    } catch (err) {
      setResult({ error: 'Prediction failed.' });
    }
    setLoading(false);
  };

  // Helper: status icon and color
  const getStatus = (key, value) => {
    const { normal } = SENSOR_INFO[key];
    if (value < normal[0]) return { icon: '🟡', color: 'text-yellow-600', status: 'Low' };
    if (value > normal[1]) return { icon: '🔴', color: 'text-red-600', status: 'High' };
    return { icon: '🟢', color: 'text-green-600', status: 'Normal' };
  };

  // Helper: contributing factors (simple rule-based)
  const getContributing = (res) => {
    if (!res) return [];
    const factors = [];
    Object.keys(SENSOR_INFO).forEach(key => {
      const { normal } = SENSOR_INFO[key];
      if (res[key] < normal[0] || res[key] > normal[1]) factors.push(SENSOR_INFO[key].label);
    });
    return factors;
  };

  return (
    <section className="section flex justify-center" id="simulator">
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
        <h2 className="text-4xl font-extrabold text-cyan-300 mb-12 flex items-center gap-3 justify-center tracking-tight">Predictive Maintenance Simulator</h2>
        <div className="flex flex-col lg:flex-row gap-16 min-h-[800px]">
          {/* Left: Sensor sliders */}
          <div className="flex-1 flex flex-col gap-10 min-w-[340px] max-w-[440px] h-full">
            {/* Vibration group */}
            <div className="bg-white/90 rounded-2xl p-8 shadow-2xl border border-blue-100">
              <div className="font-bold text-blue-700 mb-6 text-lg uppercase tracking-wider border-b pb-3">Vibration</div>
              <div className="flex flex-col gap-6">
                {['Vibration_X_mm_s', 'Vibration_Y_mm_s', 'Vibration_Z_mm_s'].map(key => (
                  <div key={key} className="grid grid-cols-5 gap-x-6 items-center w-full">
                    <label className="font-semibold text-base flex items-center gap-2">
                      {SENSOR_INFO[key].label}
                      <span className="text-gray-400 text-xs cursor-help" title={SENSOR_INFO[key].tip}>ⓘ</span>
                    </label>
                    <input
                      type="range"
                      min={SENSOR_INFO[key].normal[0] - 2}
                      max={SENSOR_INFO[key].normal[1] + 2}
                      step={0.1}
                      value={inputs[key]}
                      onChange={e => handleChange(key, Number(e.target.value))}
                      className="accent-blue-500 w-full"
                    />
                    <span className="text-blue-700 font-bold text-lg text-center">{inputs[key]}</span>
                    {(() => { const s = getStatus(key, inputs[key]); return <span className={`font-semibold ${s.color} text-base text-center`}>{s.status}</span>; })()}
                    <span className="text-xs text-gray-500 text-right">Normal: {SENSOR_INFO[key].normal[0]} - {SENSOR_INFO[key].normal[1]}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Flow & Pressure group */}
            <div className="bg-white/90 rounded-2xl p-8 shadow-2xl border border-blue-100">
              <div className="font-bold text-blue-700 mb-6 text-lg uppercase tracking-wider border-b pb-3">Flow & Pressure</div>
              <div className="flex flex-col gap-6">
                {['Flow_Rate_LPM', 'Pressure_bar'].map(key => (
                  <div key={key} className="grid grid-cols-5 gap-x-6 items-center w-full">
                    <label className="font-semibold text-base flex items-center gap-2">
                      {SENSOR_INFO[key].label}
                      <span className="text-gray-400 text-xs cursor-help" title={SENSOR_INFO[key].tip}>ⓘ</span>
                    </label>
                    <input
                      type="range"
                      min={SENSOR_INFO[key].normal[0] - 50}
                      max={SENSOR_INFO[key].normal[1] + 50}
                      step={1}
                      value={inputs[key]}
                      onChange={e => handleChange(key, Number(e.target.value))}
                      className="accent-blue-500 w-full"
                    />
                    <span className="text-blue-700 font-bold text-lg text-center">{inputs[key]}</span>
                    {(() => { const s = getStatus(key, inputs[key]); return <span className={`font-semibold ${s.color} text-base text-center`}>{s.status}</span>; })()}
                    <span className="text-xs text-gray-500 text-right">Normal: {SENSOR_INFO[key].normal[0]} - {SENSOR_INFO[key].normal[1]}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Temperature & Torque group */}
            <div className="bg-white/90 rounded-2xl p-8 shadow-2xl border border-blue-100">
              <div className="font-bold text-blue-700 mb-6 text-lg uppercase tracking-wider border-b pb-3">Temperature & Torque</div>
              <div className="flex flex-col gap-6">
                {['Temperature_C', 'Torque_Nm'].map(key => (
                  <div key={key} className="grid grid-cols-5 gap-x-6 items-center w-full">
                    <label className="font-semibold text-base flex items-center gap-2">
                      {SENSOR_INFO[key].label}
                      <span className="text-gray-400 text-xs cursor-help" title={SENSOR_INFO[key].tip}>ⓘ</span>
                    </label>
                    <input
                      type="range"
                      min={SENSOR_INFO[key].normal[0] - 20}
                      max={SENSOR_INFO[key].normal[1] + 20}
                      step={1}
                      value={inputs[key]}
                      onChange={e => handleChange(key, Number(e.target.value))}
                      className="accent-blue-500 w-full"
                    />
                    <span className="text-blue-700 font-bold text-lg text-center">{inputs[key]}</span>
                    {(() => { const s = getStatus(key, inputs[key]); return <span className={`font-semibold ${s.color} text-base text-center`}>{s.status}</span>; })()}
                    <span className="text-xs text-gray-500 text-right">Normal: {SENSOR_INFO[key].normal[0]} - {SENSOR_INFO[key].normal[1]}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Speed group */}
            <div className="bg-white/90 rounded-2xl p-8 shadow-2xl border border-blue-100">
              <div className="font-bold text-blue-700 mb-6 text-lg uppercase tracking-wider border-b pb-3">Speed</div>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-5 gap-x-6 items-center w-full">
                  <label className="font-semibold text-base flex items-center gap-2">
                    {SENSOR_INFO['Rotational_Speed_RPM'].label}
                    <span className="text-gray-400 text-xs cursor-help" title={SENSOR_INFO['Rotational_Speed_RPM'].tip}>ⓘ</span>
                  </label>
                  <input
                    type="range"
                    min={SENSOR_INFO['Rotational_Speed_RPM'].normal[0] - 200}
                    max={SENSOR_INFO['Rotational_Speed_RPM'].normal[1] + 200}
                    step={10}
                    value={inputs['Rotational_Speed_RPM']}
                    onChange={e => handleChange('Rotational_Speed_RPM', Number(e.target.value))}
                    className="accent-blue-500 w-full"
                  />
                  <span className="text-blue-700 font-bold text-lg text-center">{inputs['Rotational_Speed_RPM']}</span>
                  {(() => { const s = getStatus('Rotational_Speed_RPM', inputs['Rotational_Speed_RPM']); return <span className={`font-semibold ${s.color} text-base text-center`}>{s.status}</span>; })()}
                  <span className="text-xs text-gray-500 text-right">Normal: {SENSOR_INFO['Rotational_Speed_RPM'].normal[0]} - {SENSOR_INFO['Rotational_Speed_RPM'].normal[1]}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Vertical divider for desktop */}
          <div className="hidden lg:block w-[2px] bg-gradient-to-b from-cyan-200 via-cyan-400 to-cyan-200 mx-8 rounded-full"></div>
          {/* Right: What-if, prediction, recommendation, history */}
          <div className="flex-[1.3] flex flex-col bg-white/95 rounded-2xl p-12 shadow-2xl border border-blue-100 min-h-[800px] min-w-[480px] max-w-[1100px] h-full justify-between">
            <div className="flex flex-col gap-12 flex-grow">
              {/* Summary card */}
              <div className="flex flex-col items-center mb-2">
                <div className="w-full bg-blue-50 rounded-xl shadow p-6 flex flex-col items-center border border-blue-200">
                  <div className="text-xl font-bold text-blue-700 mb-2">Current Prediction</div>
                  <div className="text-3xl font-extrabold text-blue-900 mb-2">{result && !result.error ? result.Fault_Type : '—'}</div>
                  <div className="flex gap-8 text-base text-gray-700 mt-2">
                    <span>Sensors Normal: {Object.keys(SENSOR_INFO).filter(key => {
                      const val = inputs[key];
                      const { normal } = SENSOR_INFO[key];
                      return val >= normal[0] && val <= normal[1];
                    }).length}/{Object.keys(SENSOR_INFO).length}</span>
                    <span>Last Simulated: {history[0] ? new Date(history[0].Timestamp || Date.now()).toLocaleTimeString() : '—'}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-6 font-bold text-2xl text-blue-700 border-b pb-3">What if (Sensor Status)</div>
                <div className="flex flex-col gap-3 mb-10">
                  {Object.keys(SENSOR_INFO).map(key => {
                    const val = inputs[key];
                    const { normal, label } = SENSOR_INFO[key];
                    if (val < normal[0]) return <span key={key} className="px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 font-semibold text-base w-full">{label}: Low</span>;
                    if (val > normal[1]) return <span key={key} className="px-4 py-2 rounded-full bg-red-100 text-red-800 font-semibold text-base w-full">{label}: High</span>;
                    return <span key={key} className="px-4 py-2 rounded-full bg-green-100 text-green-800 font-semibold text-base w-full">{label}: Normal</span>;
                  })}
                </div>
              </div>
              <div>
                <div className="mb-4 font-bold text-2xl text-blue-700 mt-2 border-b pb-3">Model predicts</div>
                <ul className="mb-6 ml-2 text-lg list-disc list-inside">
                  {result && !result.error ? (
                    <li>Predicted Fault: <b>{result.Fault_Type}</b></li>
                  ) : (
                    <li>Adjust values and click Simulate Prediction</li>
                  )}
                </ul>
                <div className="mb-4 font-bold text-2xl text-blue-700 border-b pb-3">Recommended</div>
                <ul className="ml-2 text-lg">
                  {result && !result.error ? (
                    <li>→ {FAULT_RECOMMENDATIONS[result.Fault_Type] || 'Inspect and maintain as per fault type.'}</li>
                  ) : (
                    <li>→ Adjust values and simulate to get recommendations</li>
                  )}
                </ul>
              </div>
              {/* Prediction result */}
              {result && (
                <div className="mt-2 p-6 bg-white/90 rounded shadow text-gray-900">
                  {result.error ? (
                    <div className="text-red-600 font-bold text-lg">{result.error}</div>
                  ) : (
                    <>
                      <div className="text-xl font-bold mb-3">Predicted Fault: <span className="text-blue-700">{result.Fault_Type}</span></div>
                      <div className="mb-2">Torque: <b>{result.Torque_Nm}</b> Nm</div>
                      <div className="mb-2">Vibration Z: <b>{result.Vibration_Z_mm_s}</b> mm/s</div>
                      <div className="mb-2">Temperature: <b>{result.Temperature_C}</b> °C</div>
                      <div className="mb-2">Pressure: <b>{result.Pressure_bar}</b> bar</div>
                      <div className="mb-2">Flow Rate: <b>{result.Flow_Rate_LPM}</b> LPM</div>
                      {/* Contributing factors */}
                      {getContributing(result).length > 0 && (
                        <div className="mt-3 text-yellow-700 font-semibold">
                          Contributing Factors: {getContributing(result).join(', ')}
                        </div>
                      )}
                      <div className="mt-3 text-green-700 font-semibold">
                        Recommendation: {FAULT_RECOMMENDATIONS[result.Fault_Type] || 'Inspect and maintain as per fault type.'}
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* History */}
              {history.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-bold text-blue-700 mb-4 border-b pb-3 text-xl">Simulation History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-base bg-blue-50 rounded-xl shadow border border-blue-200">
                      <thead>
                        <tr className="bg-blue-100 text-blue-900">
                          <th className="p-3">Fault</th>
                          <th>Torque</th>
                          <th>Vib Z</th>
                          <th>Temp</th>
                          <th>Pressure</th>
                          <th>Flow</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((h, i) => (
                          <tr key={i} className="text-blue-900">
                            <td className="font-bold text-blue-700">{h.Fault_Type}</td>
                            <td>{h.Torque_Nm}</td>
                            <td>{h.Vibration_Z_mm_s}</td>
                            <td>{h.Temperature_C}</td>
                            <td>{h.Pressure_bar}</td>
                            <td>{h.Flow_Rate_LPM}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="flex justify-center mt-10">
                <button
                  className="button bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded px-10 py-4 shadow text-xl"
                  onClick={handleSimulate}
                  disabled={loading}
                >
                  {loading ? 'Simulating...' : 'Simulate Prediction'}
                </button>
              </div>
            </div>
            {/* How to Use / Tips section pinned to bottom */}
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-200 shadow flex flex-col items-start mt-12">
              <div className="font-bold text-blue-700 mb-3 text-lg">How to Use</div>
              <ul className="list-disc list-inside text-lg text-gray-700 space-y-2">
                <li>Adjust the sliders on the left to simulate different sensor readings.</li>
                <li>See real-time status for each sensor and overall prediction here.</li>
                <li>Click <b>Simulate Prediction</b> to get model results and recommendations.</li>
                <li>Review your recent simulations in the history table above.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatIfSimulator;