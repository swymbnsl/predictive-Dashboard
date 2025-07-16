import React, { useRef, useState } from 'react';
import GlassCardLayout from './GlassCardLayout';
import styles from '../styles/UploadReport.module.css';

const UploadReport = ({ onAnalysisComplete }) => {
  const fileInput = useRef();
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);

  const simulateProcess = (uploadTime = 1200, analyzeTime = 2500) => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setAnalyzing(true);
      setTimeout(() => {
        setAnalyzing(false);
        setDone(true);
        setReportUrl('/assets/prediction_report.csv');
        onAnalysisComplete?.();
      }, analyzeTime);
    }, uploadTime);
  };

  const handleUpload = () => {
    if (!fileInput.current.files[0]) return;
    simulateProcess();
  };

  const handleDownloadSample = () => {
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

    const rows = [
      ['2024-01-01 00:00:00', 1552.121, 43.53, 2.05, 2.08, 2.36, 69.81, 5.58, 196.77],
      ['2024-01-01 00:01:00', 1485.48, 49.03, 2.46, 2.28, 2.14, 68.21, 4.05, 198.90],
    ];

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_format.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    if (reportUrl) window.open(reportUrl, '_blank');
  };

  const handleReset = () => {
    setDone(false);
    setReportUrl(null);
    setFileName('');
    fileInput.current.value = '';
  };

  const handleFileChange = () => {
    const file = fileInput.current.files[0];
    if (file) {
      setFileName(file.name);
      setDone(false);
    }
  };

  return (
    <GlassCardLayout>
      <div className={styles.uploadContainer}>
        <h2 className={styles.uploadTitle}>🛠️ Predictive Maintenance Dashboard</h2>
        <p className={styles.uploadSubtitle}>
          🔍 Real-Time Fault Detection using Ensemble ML Model
        </p>

        {!done ? (
          <>
            <div className={styles.uploadBox}>
              <div className={styles.inputGroup}>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInput}
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <button
                  className={styles.uploadButton}
                  onClick={handleUpload}
                  disabled={!fileName || uploading || analyzing}
                >
                  ⬆ Analyze
                </button>
              </div>
            </div>

            {fileName && (
              <div className={styles.fileName}>✅ {fileName}</div>
            )}

            <div className={styles.downloadSample}>
              📂 Need a sample? →{' '}
              <button
                className={styles.sampleButton}
                onClick={handleDownloadSample}
              >
                ⇩ Download Sample Format
              </button>
            </div>

            {(uploading || analyzing) && (
              <div className={styles.processing}>
                ⏳ Processing...
                <br />
                {uploading && '⬆ Uploading file...'}
                {analyzing && (
                  <>
                    <br />
                    🔄 Analyzing data using ML model...
                    <br />
                    📡 Real-Time Fault Detection in progress...
                  </>
                )}
                <div className={styles.loader}>
                  <div className={styles.progress}></div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.result}>
            ✅ Prediction Completed
            <br />
            📄 Report is ready for download:
            <div className={styles.buttonGroup}>
              <button
                className={styles.buttonPrimary}
                onClick={handleDownloadReport}
              >
                ⬇ Download Prediction Report
              </button>
              <button
                className={styles.buttonSecondary}
                onClick={handleReset}
              >
                🔁 Upload Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </GlassCardLayout>
  );
};

export default UploadReport;
