import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const FaultTrends = () => {
  const [trendData, setTrendData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interval, setInterval] = useState('Daily');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/get_trend_data', {
      headers: { 'Cache-Control': 'no-store' },
    })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;

        const parsed = data
          .filter(item => item.Timestamp)
          .map(item => ({
            ...item,
            Timestamp: new Date(item.Timestamp),
          }))
          .sort((a, b) => a.Timestamp - b.Timestamp);

        setTrendData(parsed);

        if (parsed.length) {
          const minDate = parsed[0].Timestamp.toISOString().split('T')[0];
          const maxDate = parsed[parsed.length - 1].Timestamp.toISOString().split('T')[0];
          setStartDate(minDate);
          setEndDate(maxDate);
        }
      })
      .catch(err => {
        console.error('Failed to fetch trend data:', err);
        setTrendData([]);
      });
  }, []);

  useEffect(() => {
    if (!trendData.length) return;

    const filtered = trendData.filter((item) => {
      const date = item.Timestamp;
      return (
        (!startDate || new Date(startDate) <= date) &&
        (!endDate || date <= new Date(endDate))
      );
    });

    const grouped = {};
    filtered.forEach((item) => {
      const ts = item.Timestamp;
      let key = '';

      if (interval === 'Hourly') {
        key = ts.toISOString().slice(0, 13); // yyyy-mm-ddTHH
      } else if (interval === 'Daily') {
        key = ts.toISOString().slice(0, 10); // yyyy-mm-dd
      } else if (interval === 'Weekly') {
        const weekStart = new Date(ts);
        weekStart.setDate(ts.getDate() - ts.getDay());
        key = weekStart.toISOString().slice(0, 10);
      }

      if (!grouped[key]) {
        grouped[key] = {
          timestamp: key,
          Torque_Nm: 0,
          Vibration_Z_mm_s: 0,
          Faults: [],
          count: 0,
        };
      }

      grouped[key].Torque_Nm += item.Torque_Nm || 0;
      grouped[key].Vibration_Z_mm_s += item.Vibration_Z_mm_s || 0;
      grouped[key].Faults.push(item.Fault_Type);
      grouped[key].count += 1;
    });

    const finalData = Object.entries(grouped).map(([key, entry]) => ({
      timestamp: key,
      Torque_Nm: +(entry.Torque_Nm / entry.count).toFixed(2),
      Vibration_Z_mm_s: +(entry.Vibration_Z_mm_s / entry.count).toFixed(2),
      Fault_Type: mostFrequent(entry.Faults),
    }));

    setFilteredData(finalData);
  }, [trendData, startDate, endDate, interval]);

  const mostFrequent = (arr) => {
    const freq = {};
    let max = '';
    let maxCount = 0;
    arr.forEach(item => {
      freq[item] = (freq[item] || 0) + 1;
      if (freq[item] > maxCount) {
        max = item;
        maxCount = freq[item];
      }
    });
    return max;
  };

  return (
    <section className="section" id="trend" style={{ minHeight: '400px' }}>
      <h2>📈 Fault Trend Over Time</h2>
      <p>🗓 View average Torque and Vibration Z over time:</p>

      <div style={{ margin: '1rem 0' }}>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        {' to '}
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <select
          style={{ marginLeft: 16 }}
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
        >
          <option value="Hourly">Hourly</option>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
        </select>
      </div>

      <div style={{ minHeight: 300, height: '300px', width: '100%', background: '#fff', borderRadius: 8, padding: 8 }}>
        {filteredData.length === 0 ? (
          <p style={{ textAlign: 'center', paddingTop: 80 }}>
            No trend data available for selected range.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              onMouseMove={(e) => {
                if (e && e.activePayload) {
                  setHoveredPoint(e.activePayload[0].payload);
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Torque_Nm') return [`${value} Nm`, 'Torque'];
                  if (name === 'Vibration_Z_mm_s') return [`${value} mm/s`, 'Vibration Z'];
                  return value;
                }}
                labelFormatter={(label) => `🕒 ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="Torque_Nm" stroke="#8884d8" dot={false} />
              <Line type="monotone" dataKey="Vibration_Z_mm_s" stroke="#82ca9d" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {hoveredPoint && (
        <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#f6f6f6', borderRadius: '8px' }}>
          <h4>🧾 Selected Point Details</h4>
          <ul>
            <li><strong>Time:</strong> {hoveredPoint.timestamp}</li>
            <li><strong>Torque:</strong> {hoveredPoint.Torque_Nm} Nm</li>
            <li><strong>Vibration Z:</strong> {hoveredPoint.Vibration_Z_mm_s} mm/s</li>
            <li><strong>Most Frequent Fault:</strong> {hoveredPoint.Fault_Type || 'N/A'}</li>
          </ul>
        </div>
      )}

      <button className="button" onClick={() => window.print()} style={{ marginTop: 16 }}>
        ⬇ Export Graph Report (PDF)
      </button>
    </section>
  );
};

export default FaultTrends;
