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
      const response = await fetch('http://localhost:5000/predict_simulator', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data && data.trend_data && data.trend_data.length > 0) {
        setResult(data.trend_data[0]);
        console.log('[DEBUG] Backend returned:', data.trend_data[0]);
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
        {/* Main Title */}
        <h2 style={{
          fontSize: "2.5rem",
          fontWeight: "900",
          color: "#14e0f9",
          margin: "0 0 2rem 0"
        }}>
          Predictive Maintenance Simulator
        </h2>
        <div className="flex flex-col gap-16 min-h-[800px]">
          {/* Sensor Panel as Grid */}
          <div style={{
            background: '#232946',
            border: '1px solid #3b4252',
            borderRadius: 8,
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            padding: '1.2rem',
            margin: '0 auto 1.5rem auto',
            maxWidth: 900
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.7fr 2.2fr 0.9fr 1fr 1.2fr',
              gap: '0.3rem 0.7rem',
              alignItems: 'center',
              marginBottom: '1rem',
              color: '#7dd3fc',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '0.01em'
            }}>
              <div>Sensor</div>
              <div>Control</div>
              <div style={{textAlign:'center'}}>Value</div>
              <div style={{textAlign:'center'}}>Status</div>
              <div style={{textAlign:'right'}}>Normal Range</div>
            </div>
            {Object.keys(SENSOR_INFO).map((key, index) => {
              const s = getStatus(key, inputs[key]);
              const sliderColor = s.status === 'High' ? '#ef4444' : s.status === 'Low' ? '#eab308' : '#22c55e';
              const { normal, label } = SENSOR_INFO[key];
              return (
                <div key={key} style={{
                  display: 'grid',
                  gridTemplateColumns: '1.7fr 2.2fr 0.9fr 1fr 1.2fr',
                  gap: '0.3rem 0.7rem',
                  alignItems: 'center',
                  background: index % 2 === 0 ? '#232946' : '#181c2a',
                  borderRadius: 6,
                  marginBottom: 2,
                  padding: '0.3rem 0.1rem',
                  color: '#f4f4f8',
                  fontWeight: 500,
                  fontSize: '0.98rem'
                }}>
                  <div style={{fontWeight:600, fontSize:'0.98rem'}}>{label}</div>
                  <div>
                    <input
                      type="range"
                      min={normal[0] - (key.includes('Vibration') ? 2 : key.includes('Flow') ? 50 : key.includes('Speed') ? 200 : 20)}
                      max={normal[1] + (key.includes('Vibration') ? 2 : key.includes('Flow') ? 50 : key.includes('Speed') ? 200 : 20)}
                      step={key.includes('Vibration') ? 0.1 : key.includes('Speed') ? 10 : 1}
                      value={inputs[key]}
                      onChange={e => handleChange(key, Number(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: sliderColor,
                        height: '4px',
                        margin: '0.2rem 0'
                      }}
                    />
                  </div>
                  <div style={{textAlign:'center', fontWeight:600, color:'#7dd3fc', fontSize:'1rem'}}>{inputs[key]}</div>
                  <div style={{textAlign:'center'}}>
                    <span style={{
                      display:'inline-block',
                      padding:'0.18rem 0.9rem',
                      borderRadius: '999px',
                      fontWeight:600,
                      background: s.status === 'High' ? '#fee2e2' : s.status === 'Low' ? '#fef9c3' : '#dcfce7',
                      color: s.status === 'High' ? '#b91c1c' : s.status === 'Low' ? '#b45309' : '#166534',
                      fontSize:'0.97rem',
                      minWidth: 60
                    }}>{s.status}</span>
                  </div>
                  <div style={{textAlign:'right', color:'#bae6fd', fontSize:'0.95rem'}}>{normal[0]} - {normal[1]}</div>
                </div>
              );
            })}
          </div>
          
          {/* Prediction Results - show below sensor panels */}
          {result && (
            <div style={{ width: '100%', maxWidth: 900, margin: '2rem auto 0 auto' }}>
              <div style={{
                background: '#232946',
                border: '1px solid #3b4252',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                padding: '2rem',
                marginBottom: '2rem',
                color: '#f4f4f8'
              }}>
                {result.error ? (
                  <div style={{ color: '#f87171', fontWeight: 700, fontSize: '1.2rem', textAlign: 'center', background: '#2d2e4a', borderRadius: 8, padding: '1.5rem', border: '1px solid #f87171' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
                    {result.error}
                  </div>
                ) : (
                  <>
                    <h2 style={{ fontSize: '1.7rem', fontWeight: 700, color: '#7dd3fc', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      🎯 Prediction Results
                    </h2>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f4f4f8', marginBottom: '1.5rem', textAlign: 'center' }}>
                      {result.Fault_Type}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
                      {/* Summary Card */}
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          📌 Current Prediction
                        </h3>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f4f4f8', marginBottom: 10 }}>{result.Fault_Type}</div>
                        <div style={{ fontSize: '1rem', color: '#bae6fd', marginBottom: 4 }}>
                          Sensors Normal: {Object.keys(SENSOR_INFO).filter(key => {
                            const val = inputs[key];
                            const { normal } = SENSOR_INFO[key];
                            return val >= normal[0] && val <= normal[1];
                          }).length}/{Object.keys(SENSOR_INFO).length}
                        </div>
                        <div style={{ fontSize: '1rem', color: '#bae6fd' }}>
                          Last: {new Date().toLocaleTimeString()}
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f472b6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          💡 Recommendation
                        </h3>
                        <div style={{ fontSize: '1rem', color: '#f4f4f8' }}>{FAULT_RECOMMENDATIONS[result.Fault_Type] || 'Inspect and maintain as per fault type.'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
                      {/* Sensor Readings Table */}
                      <div style={{ flex: 1, minWidth: 320 }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#facc15', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          📊 Sensor Readings
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', background: '#181c2a', borderRadius: 8, boxShadow: '0 1px 4px rgba(44,62,80,0.10)', border: '1px solid #334155', fontSize: '1rem', color: '#f4f4f8' }}>
                            <thead>
                              <tr style={{ background: '#232946', color: '#7dd3fc' }}>
                                <th style={{ padding: 8, textAlign: 'left', fontWeight: 700 }}>Sensor</th>
                                <th style={{ padding: 8, textAlign: 'center', fontWeight: 700 }}>Value</th>
                                <th style={{ padding: 8, textAlign: 'center', fontWeight: 700 }}>Unit</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ color: '#f4f4f8', borderTop: '1px solid #334155' }}>
                                <td style={{ padding: 8, fontWeight: 600 }}>Torque</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>{result.Torque_Nm}</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>Nm</td>
                              </tr>
                              <tr style={{ color: '#f4f4f8', borderTop: '1px solid #334155' }}>
                                <td style={{ padding: 8, fontWeight: 600 }}>Vibration Z</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>{result.Vibration_Z_mm_s}</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>mm/s</td>
                              </tr>
                              <tr style={{ color: '#f4f4f8', borderTop: '1px solid #334155' }}>
                                <td style={{ padding: 8, fontWeight: 600 }}>Temperature</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>{result.Temperature_C}</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>°C</td>
                              </tr>
                              <tr style={{ color: '#f4f4f8', borderTop: '1px solid #334155' }}>
                                <td style={{ padding: 8, fontWeight: 600 }}>Pressure</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>{result.Pressure_bar}</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>bar</td>
                              </tr>
                              <tr style={{ color: '#f4f4f8', borderTop: '1px solid #334155' }}>
                                <td style={{ padding: 8, fontWeight: 600 }}>Flow Rate</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>{result.Flow_Rate_LPM}</td>
                                <td style={{ padding: 8, textAlign: 'center' }}>LPM</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Analysis */}
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#5eead4', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          🧠 Analysis
                        </h3>
                        {getContributing(result).length > 0 ? (
                          <div style={{ background: '#fef9c3', borderRadius: 8, padding: '1rem', border: '1px solid #fde68a', color: '#b45309', fontWeight: 600 }}>
                            ⚠️ Contributing Factors: {getContributing(result).join(', ')}
                          </div>
                        ) : (
                          <div style={{ background: '#166534', borderRadius: 8, padding: '1rem', border: '1px solid #bbf7d0', color: '#f4f4f8', fontWeight: 600 }}>
                            ✅ All sensors normal. No contributing factors detected.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Centered Simulate Button below sensor panel */}
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          marginTop: '2.5rem',
          marginBottom: '2.5rem'
        }}>
          <button
            className="button bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-20 py-10 shadow-2xl text-3xl transform hover:scale-110 transition-all duration-300 border-2 border-blue-500"
            onClick={handleSimulate}
            disabled={loading}
          >
            {loading ? 'Simulating...' : 'Simulate Prediction'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default WhatIfSimulator;