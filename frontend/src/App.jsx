import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import './index.css';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <header className="app-header">
          <h1 className="app-title">OYA: National Cyclone Command</h1>
          <nav style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
            <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
            <Link to="/alerts" style={{ color: 'white', textDecoration: 'none', fontWeight: 600 }}>Regional Alerts</Link>
          </nav>
        </header>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard/:id" element={<Dashboard />} />
            <Route path="/alerts" element={<Alerts />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}