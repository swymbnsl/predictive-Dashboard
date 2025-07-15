import React, { useState, useEffect } from 'react';
import UploadReport from '../components/UploadReport';
import SampleFormat from '../components/SampleFormat';
import FaultSummary from '../components/FaultSummary';
import FaultTrends from '../components/FaultTrends';
import Scheduler from '../components/Scheduler';
import SensorHeatmap from '../components/SensorHeatmap';
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

  switch (hash) {
    case "#upload":
      return <UploadReport onAnalysisComplete={() => {}} />;
    case "#summary":
      return <FaultSummary />;
    case "#trend":
      return <FaultTrends />;
    case "#scheduler":
      return <Scheduler />;
    case "#heatmap":
      return <SensorHeatmap />;
    case "#simulator":
      return <WhatIfSimulator />;
    default:
      return (
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <button className="button" onClick={() => setShowSample(true)}>
            📂 View Sample Format Page
          </button>
        </div>
      );
  }
};

export default Home;