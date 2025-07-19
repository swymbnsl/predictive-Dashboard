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
    <section className="section" id="trend">
      <h2 className="text-xl font-bold mb-2">📈 Fault Trend Over Time</h2>
      <p className="text-sm text-gray-700 mb-4">🗓 View how different faults occurred over time:</p>

      {/* Empty state if no data */}
      {rawData.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-white/80 rounded-xl shadow-lg border border-blue-100">
          <span className="text-5xl mb-4">📂</span>
          <p className="text-lg text-gray-500 font-semibold mb-2">No data to display</p>
          <p className="text-gray-400">Please upload and analyze a file to see the fault trend graph.</p>
        </div>
      ) : (
        <>
          {/* Controls Card */}
          <div className="bg-white/80 rounded-xl shadow-lg p-5 flex flex-wrap gap-6 mb-6 items-end border border-blue-100 mt-8">
            {/* Date Range Picker */}
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-end gap-0 bg-white/95 rounded-full px-2 py-2 shadow-2xl border-2 border-blue-200">
                {/* Start Date */}
                <div className="flex flex-col items-center px-6 py-2">
                  <label className="font-bold text-blue-700 text-xs mb-1 tracking-wider uppercase" htmlFor="start-date">Start Date</label>
                  <DatePicker
                    id="start-date"
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Start Date"
                    className="hidden"
                    isClearable
                    calendarClassName="rounded-lg shadow-lg border border-blue-200"
                    popperPlacement="bottom-start"
                    customInput={<DateInput value={startDate ? startDate.toLocaleDateString() : ""} placeholder="Start Date" />}
                  />
                </div>
                {/* Separator */}
                <div className="flex flex-col items-center px-2">
                  <span className="rounded-full bg-gradient-to-br from-blue-100 via-blue-200 to-blue-50 text-blue-700 font-extrabold text-base px-5 py-2 shadow border-2 border-blue-200" style={{ letterSpacing: 2, marginTop: 24, marginBottom: 8 }}>to</span>
                </div>
                {/* End Date */}
                <div className="flex flex-col items-center px-6 py-2">
                  <label className="font-bold text-blue-700 text-xs mb-1 tracking-wider uppercase" htmlFor="end-date">End Date</label>
                  <DatePicker
                    id="end-date"
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="End Date"
                    className="hidden"
                    isClearable
                    calendarClassName="rounded-lg shadow-lg border border-blue-200"
                    popperPlacement="bottom-end"
                    customInput={<DateInput value={endDate ? endDate.toLocaleDateString() : ""} placeholder="End Date" />}
                  />
                </div>
              </div>
            </div>
            {/* Granularity Selector */}
            <div className="flex flex-col">
              <label className="font-medium mb-1">⏳ Granularity</label>
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-800 font-medium min-w-[140px]"
              >
                <option value="Hourly">Hourly</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={filteredData}
              margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
              onMouseMove={handleHover}
              onMouseLeave={() => setTooltipData(null)}
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
                  stroke={webColorMap[fault]}
                  name={fault}
                  dot={false}
                  strokeWidth={2}
                  filter="url(#glow)"
                />
              ))}
              {/* SVG filter for glow effect */}
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            </LineChart>
          </ResponsiveContainer>

          {tooltipData && tooltipData.length > 0 && (
            <div className="mt-4 p-4 bg-gray-100 rounded shadow text-sm">
              <h3 className="font-semibold text-lg">💡 Fault Details</h3>
              {tooltipData.map((detail, idx) => (
                <div key={idx} className="mb-2">
                  <p><strong>Fault:</strong> {detail.fault}</p>
                  <p><strong>Time:</strong> {new Date(detail.timestamp).toLocaleString()}</p>
                  {Object.entries(detail).map(([key, val]) =>
                    !["timestamp", "fault"].includes(key) ? (
                      <p key={key}><strong>{key}:</strong> {val}</p>
                    ) : null
                  )}
                  <hr />
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