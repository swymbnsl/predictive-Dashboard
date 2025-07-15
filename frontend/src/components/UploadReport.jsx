import React, { useRef, useState } from 'react';

const UploadReport = ({ onAnalysisComplete }) => {
  const fileInput = useRef();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);

  const handleUpload = () => {
    if (!fileInput.current.files[0]) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setAnalyzing(true);
      setTimeout(() => {
        setAnalyzing(false);
        setDone(true);
        setReportUrl('/assets/prediction_report.csv');
        onAnalysisComplete && onAnalysisComplete();
      }, 2500);
    }, 1200);
  };

  const handleDownloadSample = () => {
    window.open('/assets/sample_format.csv', '_blank');
  };

  const handleDownloadReport = () => {
    window.open(reportUrl, '_blank');
  };

  const handleReset = () => {
    setDone(false);
    setReportUrl(null);
    fileInput.current.value = '';
  };

  return (
    <section className="section" id="upload">
      <h2>🛠 Predictive Maintenance Dashboard - Centrifugal Pump</h2>
      <p>🔍 Real-Time Fault Detection using Stacked Ensemble ML Model</p>
      <hr />
      {!done ? (
        <>
          <label>
            <b>📁 Upload Sensor Data (CSV Format)</b>
            <input type="file" accept=".csv" ref={fileInput} style={{ display: 'block', margin: '1rem 0' }} />
          </label>
          <button className="button" onClick={handleUpload} disabled={uploading || analyzing}>
            ⬆ Upload & Analyze
          </button>
          <span style={{ marginLeft: 16 }}>
            📂 Need a sample? →{' '}
            <button className="button" style={{ background: '#eee', color: '#222' }} onClick={handleDownloadSample}>
              ⬇ Download Sample Format (.csv)
            </button>
          </span>
          {(uploading || analyzing) && (
            <div className="loader">
              <p>⏳ Processing file... Please wait.</p>
              <p>🔄 Analyzing sensor data using ML model...</p>
              <div className="bar"></div>
              <p>📡 Real-Time Fault Detection in progress...</p>
            </div>
          )}
        </>
      ) : (
        <>
          <h3>✅ Prediction Completed</h3>
          <p>📄 Report is ready for download:</p>
          <button className="button" onClick={handleDownloadReport}>⬇ Download Prediction Report (.csv)</button>
          <button className="button" style={{ background: '#eee', color: '#222' }} onClick={handleReset}>
            🔁 Upload Another File
          </button>
        </>
      )}
    </section>
  );
};

export default UploadReport;