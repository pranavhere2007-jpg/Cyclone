import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCycloneData } from '../data/dataCollector';
import IntensityBadge from '../components/IntensityBadge';
import EmergencyHelplines from '../components/EmergencyHelplines';

export default function Home() {
  const [cyclones, setCyclones] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function getData() {
      const data = await fetchCycloneData();
      if (data) setCyclones(data);
      setLoading(false);
    }
    getData();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading active cyclone systems...</div>;
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* 1. Emergency Helplines Deck (Sits standalone right at the top) */}
      <EmergencyHelplines />

      {/* 2. Main Page Section Title */}
      <div className="home-header" style={{ textAlign: 'center', margin: '2rem 0 1.5rem 0' }}>
        <h2 className="ribbon-title">ACTIVE TROPICAL CYCLONES</h2>
      </div>

      {/* 3. Active Cyclone Cards Grid */}
      {cyclones.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No Active Cyclonic Systems Detected</h3>
          <p style={{ color: '#64748b' }}>All regional monitoring sensors report normal conditions.</p>
        </div>
      ) : (
        <div 
          className="cyclone-grid" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '1.5rem' 
          }}
        >
          {cyclones.map((item) => (
            <div key={item.id} className="card cyclone-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                    {item.cyclone_name || item.name || 'Unnamed System'}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>ID: {item.id}</span>
                </div>
                <IntensityBadge classification={item.classification} />
              </div>

              <div className="telemetry-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
                <span>Current Wind Speed:</span>
                <strong style={{ color: '#dc2626' }}>
                  {item.wind_speed || item.max_sustained_wind || '--'} km/h
                </strong>
              </div>

              <div className="telemetry-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
                <span>Central Pressure:</span>
                <strong>{item.pressure || item.central_pressure || '--'} hPa</strong>
              </div>

              <button 
                className="btn-primary" 
                style={{ marginTop: '1.25rem', width: '100%' }}
                onClick={() => navigate(`/dashboard/${item.id}`)}
              >
                View Full Dashboard
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}