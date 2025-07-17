import React from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import './styles/globals.css';

function App() {
  return (
    <div className="main-content">
      <Navbar />
      <div style={{ paddingTop: '80px', position: 'relative', zIndex: 1 }}>
        <Home />
      </div>
    </div>
  );
}

export default App;