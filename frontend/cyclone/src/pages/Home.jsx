import React, { useState, useEffect } from 'react';
import { fetchCycloneData } from '../data/dataCollector';
import CycloneCard from '../components/CycloneCard';
import "../index.css";
//import Helplines from '../components/HelpLines';

export default function Home() {
  const [cyclones, setCyclones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getCyclones() {
      const data = await fetchCycloneData();
      if (data) {
        setCyclones(data);
      }
      setLoading(false);
    }
    
    getCyclones();
  }, []);

  return (
    <div>
      <div className="ribbon-container">
        <h2 className="ribbon-heading">Active Tropical Cyclones</h2>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          Initializing telemetry uplink...
        </div>
      ) : (
        <div className="cards-grid">
          {cyclones.map((cyclone) => (
            <CycloneCard key={cyclone.id} cyclone={cyclone} />
          ))}
        </div>
      )}
    </div>
  );
}