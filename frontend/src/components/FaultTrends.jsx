import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaRegCalendarAlt } from "react-icons/fa";
import { LuDownload } from "react-icons/lu";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const FaultTrend = () => {
  const [rawData, setRawData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [tooltipData, setTooltipData] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [granularity, setGranularity] = useState("Hourly");
  const [faultTypes, setFaultTypes] = useState([]);
  const exportRef = React.useRef();

  // Color maps
  // Bright, glowing colors for web
  const webColorMap = {
    "Misalignment": "#ff4c4c",      // bright red
    "Imbalance": "#1e90ff",        // bright blue
    "Bearing Fault": "#a259ff",    // bright purple
    "Cavitation": "#00e676",       // bright green
    "Normal": "#ffd700",           // gold
  };
  // Dark, high-contrast colors for PDF
  const pdfColorMap = {
    "Misalignment": "#e74c3c",      // bright red
    "Imbalance": "#2980b9",        // blue
    "Bearing Fault": "#8e44ad",    // purple
    "Cavitation": "#27ae60",       // green
    "Normal": "#f1c40f",           // yellow
  };
  // Use webColorMap for web, pdfColorMap for PDF
  const colorMap = webColorMap;

  // Always use all faults in this order
  const ALL_FAULTS = ['Bearing Fault', 'Cavitation', 'Imbalance', 'Misalignment', 'Normal'];

  // useEffect: Fetch data and set calendar to min/max timestamp from input file
  useEffect(() => {
    axios.get("http://127.0.0.1:5000/get_trend_data")
      .then((res) => {
        const data = res.data?.trend_data || [];
        const parsed = data.map(d => ({
          ...d,
          timestamp: new Date(d.Timestamp), // Use 'Timestamp' from backend
          fault: d.Fault_Type || "Unknown", // Map 'Fault_Type' to 'fault'
        })).filter(d => !isNaN(d.timestamp));

        parsed.sort((a, b) => a.timestamp - b.timestamp);

        if (parsed.length === 0) return;

        const min = parsed[0].timestamp;
        const max = parsed[parsed.length - 1].timestamp;

        setRawData(parsed);
        setStartDate(min); // Calendar defaults to min timestamp
        setEndDate(max);   // Calendar defaults to max timestamp

        // Only include faults that are present in the data
        const presentFaults = Array.from(new Set(parsed.map(d => d.fault))).filter(f => f && f !== 'Unknown');
        setFaultTypes(presentFaults);
        console.log("[DEBUG] Parsed rawData:", parsed);
      })
      .catch(err => console.error("Error loading trend data:", err));
  }, []);

  // Update chart when data, date, or granularity changes
  useEffect(() => {
    if (!rawData.length || !startDate || !endDate) return;
    console.log("[DEBUG] Filtering from", startDate, "to", endDate);
    const grouped = {};

    rawData
      .filter(d => d.timestamp >= startDate && d.timestamp <= endDate)
      .forEach(d => {
        const ts = new Date(d.timestamp);
        const fault = d.fault || "Unknown";

        let key = "";
        if (granularity === "Hourly") {
          key = ts.toISOString().slice(0, 13); // yyyy-mm-ddTHH
        } else if (granularity === "Daily") {
          key = ts.toISOString().slice(0, 10);
        } else if (granularity === "Weekly") {
          const weekStart = new Date(ts);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().slice(0, 10);
        }

        if (!grouped[key]) grouped[key] = {};
        if (!grouped[key][fault]) grouped[key][fault] = [];

        grouped[key][fault].push(d);
      });

    const formatted = [];

    Object.entries(grouped).forEach(([time, faults]) => {
      const entry = { timestamp: time, detailsByFault: {} };

      faultTypes.forEach(fault => {
        if (faults[fault]) {
          entry[fault] = faults[fault].length;
          entry.detailsByFault[fault] = faults[fault][faults[fault].length - 1];
        } else {
          entry[fault] = 0;
        }
      });

      formatted.push(entry);
    });

    formatted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    setFilteredData(formatted);
    console.log("[DEBUG] Filtered chart data:", formatted);
  }, [rawData, startDate, endDate, granularity, faultTypes]);

  // Tooltip handler: show all fault parameters for hovered chart point below the chart
  const handleHover = (payload) => {
    const point = payload?.activePayload?.[0]?.payload;
    if (!point) return setTooltipData(null);

    // Collect all details for all faults at this point
    const allDetails = point.detailsByFault || {};
    setTooltipData(Object.values(allDetails));
  };

  // Assign colors to new faults
  faultTypes.forEach(fault => {
    if (!colorMap[fault]) {
      colorMap[fault] = "#" + Math.floor(Math.random() * 16777215).toString(16);
    }
  });

  // Calculate fault counts for summary
  const faultCounts = React.useMemo(() => {
    const counts = {};
    filteredData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key !== 'timestamp' && key !== 'detailsByFault') {
          counts[key] = (counts[key] || 0) + row[key];
        }
      });
    });
    return counts;
  }, [filteredData]);

  // PDF export function
  const exportPDF = async () => {
    const input = exportRef.current;
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
    pdf.save('Fault_Trend_Report.pdf');
  };

  // Gorgeous date input for DatePicker
  const DateInput = React.forwardRef(({ value, onClick, placeholder }, ref) => (
    <button
      type="button"
      onClick={onClick}
      ref={ref}
      className="flex items-center gap-4 border border-blue-300 bg-gradient-to-br from-white via-blue-50 to-blue-100 rounded-full px-6 py-2 shadow-xl hover:shadow-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-300 transition-all duration-200 text-gray-900 font-bold min-w-[150px] text-lg outline-none transform hover:scale-105"
      style={{ minWidth: 150, boxShadow: '0 6px 24px #b6eaff55' }}
    >
      <FaRegCalendarAlt className="text-blue-600 text-2xl drop-shadow" />
      <span className={!value ? 'text-gray-400 font-normal' : ''}>{value || placeholder}</span>
    </button>
  ));

  return (
    <section className="section" id="trend" style={{ background: '#181c2a', minHeight: '100vh', paddingBottom: '3rem' }}>
      <h2 style={{ color: '#14e0f9', fontWeight: 900, fontSize: '2.2rem', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>📈 Fault Trend Over Time</h2>
      <p style={{ color: '#bae6fd', fontSize: '1.1rem', marginBottom: '2.5rem', fontWeight: 500 }}>🗓 View how different faults occurred over time:</p>

      {/* Empty state if no data */}
      {rawData.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, padding: 32, background: '#232946', borderRadius: 16, boxShadow: '0 2px 12px rgba(20,224,249,0.08)', border: '1.5px solid #7dd3fc' }}>
          <span style={{ fontSize: '3rem', marginBottom: 16 }}>📂</span>
          <p style={{ fontSize: '1.2rem', color: '#7dd3fc', fontWeight: 700, marginBottom: 8 }}>No data to display</p>
          <p style={{ color: '#bae6fd' }}>Please upload and analyze a file to see the fault trend graph.</p>
        </div>
      ) : (
        <>
          {/* Controls Card */}
          <div style={{
            background: '#232946',
            borderRadius: 8,
            border: '1.5px solid #7dd3fc',
            boxShadow: '0 2px 12px rgba(20,224,249,0.08)',
            padding: '0.8rem 1.2rem',
            marginBottom: '2.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.2rem',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Date Range Picker */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2.5rem',
              background: '#232946',
              borderRadius: '10px',
              border: '1.5px solid #7dd3fc',
              padding: '1.2rem 2.2rem',
              boxShadow: '0 2px 12px rgba(20,224,249,0.08)',
              marginBottom: '0.5rem',
              marginTop: '0.5rem'
            }}>
              {/* Start Date */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{
                  color: '#7dd3fc',
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  marginBottom: '0.4rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }} htmlFor="start-date">Start Date</label>
                <DatePicker
                  id="start-date"
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Start Date"
                  isClearable
                  calendarClassName="calendar-dark"
                  popperPlacement="bottom-start"
                  customInput={
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.7rem',
                      background: '#181c2a', color: '#f4f4f8', border: '1.5px solid #7dd3fc',
                      borderRadius: 7, padding: '0.5rem 2.5rem 0.5rem 1.2rem', fontWeight: 700, fontSize: '1.1rem', minWidth: 140, cursor: 'pointer', position: 'relative'
                    }}>
                      <FaRegCalendarAlt style={{ color: '#7dd3fc', fontSize: '1.3rem' }} />
                      <span>{startDate ? startDate.toLocaleDateString() : 'Start Date'}</span>
                    </div>
                  }
                />
              </div>
              {/* Separator */}
              <div style={{ color: '#7dd3fc', fontWeight: 900, fontSize: '1.3rem', margin: '0 0.5rem' }}>to</div>
              {/* End Date */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{
                  color: '#7dd3fc',
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  marginBottom: '0.4rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }} htmlFor="end-date">End Date</label>
                <DatePicker
                  id="end-date"
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="End Date"
                  isClearable
                  calendarClassName="calendar-dark"
                  popperPlacement="bottom-end"
                  customInput={
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.7rem',
                      background: '#181c2a', color: '#f4f4f8', border: '1.5px solid #7dd3fc',
                      borderRadius: 7, padding: '0.5rem 2.5rem 0.5rem 1.2rem', fontWeight: 700, fontSize: '1.1rem', minWidth: 140, cursor: 'pointer', position: 'relative'
                    }}>
                      <FaRegCalendarAlt style={{ color: '#7dd3fc', fontSize: '1.3rem' }} />
                      <span>{endDate ? endDate.toLocaleDateString() : 'End Date'}</span>
                    </div>
                  }
                />
              </div>
            </div>
            {/* Granularity Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 180 }}>
              <label style={{ color: '#bae6fd', fontWeight: 700, fontSize: '1.05rem', marginBottom: 6, letterSpacing: '0.03em' }}>⏳ Granularity</label>
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value)}
                style={{
                  border: '1.5px solid #7dd3fc',
                  borderRadius: 8,
                  padding: '0.7rem 1.5rem',
                  background: '#181c2a',
                  color: '#f4f4f8',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  boxShadow: '0 1px 6px rgba(20,224,249,0.06)',
                  minWidth: 120,
                  outline: 'none',
                  marginTop: 2
                }}
              >
                <option value="Hourly">Hourly</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
          </div>

          {/* Chart Card */}
          <div style={{
            background: '#232946',
            borderRadius: 16,
            border: '1.5px solid #7dd3fc',
            boxShadow: '0 2px 16px rgba(20,224,249,0.10)',
            padding: '2.5rem 2.5rem 2rem 2.5rem',
            marginBottom: '2.5rem',
            position: 'relative'
          }}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={filteredData}
                margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                onMouseMove={handleHover}
                onMouseLeave={() => setTooltipData(null)}
              >
                <XAxis dataKey="timestamp" stroke="#bae6fd" tick={{ fill: '#bae6fd', fontWeight: 600 }} />
                <YAxis stroke="#bae6fd" tick={{ fill: '#bae6fd', fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{ background: '#232946', border: '1.5px solid #7dd3fc', borderRadius: 10, color: '#f4f4f8', fontWeight: 700 }}
                  labelStyle={{ color: '#14e0f9', fontWeight: 800 }}
                />
                <Legend
                  wrapperStyle={{
                    padding: '0 0 10px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.2rem',
                    fontWeight: 700
                  }}
                  iconType="plainline"
                  formatter={(value, entry, index) => (
                    <span style={{
                      background: colorMap[value] || '#7dd3fc',
                      color: '#232946',
                      borderRadius: 999,
                      padding: '0.3em 1.1em',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      marginRight: 8,
                      display: 'inline-block',
                      boxShadow: '0 1px 4px rgba(20,224,249,0.10)'
                    }}>{value}</span>
                  )}
                />
                {faultTypes.map(fault => (
                  <Line
                    key={fault}
                    type="monotone"
                    dataKey={fault}
                    stroke={colorMap[fault]}
                    name={fault}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tooltip Data Below Chart */}
          {tooltipData && (
            <div style={{
              background: '#232946',
              border: '1.5px solid #7dd3fc',
              borderRadius: 12,
              boxShadow: '0 1px 8px rgba(20,224,249,0.08)',
              padding: '1.2rem 2rem',
              marginBottom: '2.5rem',
              color: '#f4f4f8',
              fontWeight: 600,
              fontSize: '1.08rem',
              marginTop: '1.5rem'
            }}>
              <div style={{ color: '#14e0f9', fontWeight: 800, fontSize: '1.15rem', marginBottom: 8 }}>Details for Selected Point:</div>
              {tooltipData.map((d, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <span style={{ color: colorMap[d.Fault_Type] || '#7dd3fc', fontWeight: 700 }}>{d.Fault_Type}</span>
                  {Object.entries(d).filter(([k]) => k !== 'Fault_Type' && k !== 'Timestamp').map(([k, v]) => (
                    <span key={k} style={{ marginLeft: 12, color: '#bae6fd', fontWeight: 500 }}>{k}: {v}</span>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Hidden export section for PDF */}
          <section
            ref={exportRef}
            style={{
              position: 'fixed',
              top: '-9999px',
              left: '-9999px',
              width: '190mm',
              minHeight: '280mm',
              backgroundColor: '#fff',
              color: '#181818', // dark text
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              padding: '30px 40px',
              boxSizing: 'border-box',
              border: '1px solid #222',
              borderRadius: '8px',
              zIndex: -1,
              overflowWrap: 'break-word',
            }}
          >
            <h2 style={{ fontWeight: '700', fontSize: '24px', marginBottom: '10px', letterSpacing: '0.03em' }}>
              📈 Fault Trend Over Time
            </h2>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              This report shows the trend of detected faults over time, color-coded by fault type.
            </p>
            <div style={{ marginBottom: '18px' }}>
              <strong>Legend:</strong>
              <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', margin: '10px 0 0 0', padding: 0, listStyle: 'none' }}>
                {faultTypes.map(fault => (
                  <li key={fault} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 4, background: pdfColorMap[fault], marginRight: 8, border: '1px solid #222' }}></span>
                    <span style={{ color: '#181818', fontWeight: 700 }}>{fault}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ marginBottom: '18px' }}>
              <strong>Fault Counts:</strong>
              <ul style={{ margin: '10px 0 0 0', padding: 0, listStyle: 'none' }}>
                {faultTypes.map(fault => (
                  <li key={fault} style={{ color: '#181818', fontWeight: 600 }}>{fault}: {faultCounts[fault] || 0}</li>
                ))}
              </ul>
            </div>
            <div style={{ marginBottom: '24px', width: '100%', height: 350 }}>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={filteredData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                >
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {faultTypes.map(fault => (
                    <Line
                      key={fault}
                      type="monotone"
                      dataKey={fault}
                      stroke={pdfColorMap[fault]}
                      name={fault}
                      dot={false}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: '13px', color: '#222', marginTop: 18 }}>
              <em>Generated by Predictive Maintenance Dashboard</em>
            </div>
          </section>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              className="button flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
              onClick={exportPDF}
            >
              <LuDownload className="text-lg" />
              Export PDF
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default FaultTrend;