import React, { useState, useEffect } from 'react';
import UploadReport from '../components/UploadReport';
import SampleFormat from '../components/SampleFormat';
import FaultSummary from '../components/FaultSummary';
import FaultTrends from '../components/FaultTrends';
import Scheduler from '../components/Scheduler';
import WhatIfSimulator from '../components/WhatIfSimulator';

const Home = () => {
  const [showSample, setShowSample] = useState(false);
  const [hash, setHash] = useState(window.location.hash || "#upload");

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || "#upload");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (showSample) {
    return <SampleFormat onBack={() => setShowSample(false)} />;
  }

  const renderStyle = (targetHash) =>
    hash === targetHash ? { display: 'block' } : { display: 'none' };

  return (
    <>
      <div style={renderStyle("#upload")}>
        <UploadReport onAnalysisComplete={() => {}} />
      </div>
      <div style={renderStyle("#summary")}>
        <FaultSummary />
      </div>
      <div style={renderStyle("#trend")}>
        <FaultTrends />
      </div>
      <div style={renderStyle("#scheduler")}>
        <Scheduler />
      </div>
      <div style={renderStyle("#simulator")}>
        <WhatIfSimulator />
      </div>
      {/* Optional: fallback if no hash matches */}
      {![ "#upload", "#summary", "#trend", "#scheduler", "#simulator" ].includes(hash) && (
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <button className="button" onClick={() => setShowSample(true)}>
            📂 View Sample Format Page
          </button>
        </div>
      )}
    </>
  );
};

export default Home;
