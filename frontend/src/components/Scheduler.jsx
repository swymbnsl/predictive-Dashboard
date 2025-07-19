import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const generateFutureDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

const PRIORITY_MAP = {
  "Bearing Fault": { task: "Lubricate Bearings", priority: "Urgent", daysFromNow: 2 },
  "Misalignment": { task: "Realign Shaft", priority: "Medium", daysFromNow: 4 },
  "Imbalance": { task: "Vibration Check", priority: "Next Week", daysFromNow: 7 },
};

const Scheduler = () => {
  const faultCounts = JSON.parse(localStorage.getItem('fault_counts')) || {};
  const reportRef = useRef();
  const hiddenReportRef = useRef();

  const ALL_FAULTS = ['Bearing Fault', 'Cavitation', 'Imbalance', 'Misalignment', 'Normal'];
  const plannedTasks = ALL_FAULTS.map(fault => {
    const count = faultCounts[fault] || 0;
    if (fault === 'Normal') return null; // Never schedule for Normal
    if (count > 0) {
      if (PRIORITY_MAP[fault]) {
        const { task, priority, daysFromNow } = PRIORITY_MAP[fault];
        const date = generateFutureDate(daysFromNow);
        return { fault, task, priority, count, date };
      } else {
        // Schedule for all faults, even if not in PRIORITY_MAP
        const task = 'General inspection';
        const priority = 'Low';
        const daysFromNow = 10;
        const date = generateFutureDate(daysFromNow);
        return { fault, task, priority, count, date };
      }
    }
    return null;
  }).filter(Boolean);

  const exportPDF = () => {
    const input = hiddenReportRef.current;
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20; // margin 10mm left & right
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
      pdf.save('Maintenance_Schedule.pdf');
    });
  };

  return (
    <>
      <section className="section" id="scheduler">
        <div ref={reportRef} style={{ flex: 1 }}>
          <h2>🛠 Maintenance Scheduler</h2>
          <p>Auto-prioritized based on detected faults and sensor data</p>

          <div className="divider" />

          {plannedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] p-8 bg-white/80 rounded-xl shadow-lg border border-blue-100">
              <span className="text-5xl mb-4">📂</span>
              <p className="text-lg text-gray-500 font-semibold mb-2">No schedule to display</p>
              <p className="text-gray-400">Please upload and analyze a file to see the maintenance schedule.</p>
            </div>
          ) : (
            <>
              <div className="processing">📊 Maintenance Plan Based on Fault Frequency:</div>
              <ul>
                {plannedTasks.map(({ fault, task, priority, count }) => (
                  <li key={fault}>
                    <strong>{task}</strong> → <span>{priority}</span> ({count} {fault}{count !== 1 ? "s" : ""} today)
                  </li>
                ))}
              </ul>

              <div className="divider" />

              <div className="processing">📅 Upcoming Maintenance Dates:</div>
              <ul>
                {plannedTasks.map(({ fault, date }) => (
                  <li key={fault}>
                    {date} → <strong>{fault}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button className="button" onClick={exportPDF}>
            📤 Export as PDF
          </button>
        </div>
      </section>

      {/* Hidden styled section for PDF export */}
      <section
        ref={hiddenReportRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '190mm',
          minHeight: '280mm',
          backgroundColor: '#fff',
          color: '#000',
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          lineHeight: '1.6',
          padding: '30px 40px',
          boxSizing: 'border-box',
          border: '1px solid #ddd',
          borderRadius: '8px',
          zIndex: -1,
          overflowWrap: 'break-word',
        }}
      >
        <h2 style={{ fontWeight: '700', fontSize: '24px', marginBottom: '10px', letterSpacing: '0.03em' }}>
          🛠 Maintenance Scheduler
        </h2>
        <p style={{ fontSize: '16px', marginBottom: '20px' }}>
          Auto-prioritized based on detected faults and sensor data
        </p>

        <hr style={{ borderColor: '#ccc', marginBottom: '20px' }} />

        {plannedTasks.length === 0 ? (
          <p style={{ fontSize: '16px' }}>✅ All systems normal. No maintenance scheduled.</p>
        ) : (
          <>
            <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '10px' }}>
              📊 Maintenance Plan Based on Fault Frequency:
            </div>

            <ul style={{ marginBottom: '30px', paddingLeft: '20px' }}>
              {plannedTasks.map(({ fault, task, priority, count }) => (
                <li key={fault} style={{ marginBottom: '8px' }}>
                  <strong>{task}</strong> → <span>{priority}</span>{" "}
                  ({count} {fault}{count > 1 ? "s" : ""} today)
                </li>
              ))}
            </ul>

            <hr style={{ borderColor: '#ccc', marginBottom: '20px' }} />

            <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '10px' }}>
              📅 Upcoming Maintenance Dates:
            </div>

            <ul style={{ paddingLeft: '20px' }}>
              {plannedTasks.map(({ fault, date }) => (
                <li key={fault} style={{ marginBottom: '6px' }}>
                  {date} → <strong>{fault}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
};

export default Scheduler;
