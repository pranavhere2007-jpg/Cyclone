import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCycloneData } from '../data/dataCollector';
import MapView from '../components/MapView';
import IntensityBadge from '../components/IntensityBadge';
import CycloneDetails from '../components/CycloneDetails';
import ComparisonTable from '../components/ComparisonTable';
import SatelliteImage from '../components/SatelliteImage';

export default function Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cyclone, setCyclone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' or 'satellite'

  useEffect(() => {
    async function loadData() {
      const data = await fetchCycloneData();
      if (data && data.length > 0) {
        const selected = data.find((c) => String(c.id) === String(id)) || data[0];
        setCyclone(selected);
      }
      setLoading(false);
    }
    loadData();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard telemetry...</div>;
  if (!cyclone) return <div style={{ padding: '2rem', textAlign: 'center' }}>No cyclone telemetry available.</div>;

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <button 
        onClick={() => navigate('/')} 
        className="btn-primary" 
        style={{ marginBottom: '1.5rem', width: 'auto', display: 'inline-block' }}
      >
        &larr; Back to Active List
      </button>

      {/* Dashboard Header */}
      <div className="card dashboard-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ marginBottom: 0 }}>
            {cyclone.cyclone_name || cyclone.name || "Unnamed System"}
          </h2>
          <p className="page-subtitle">ID: {cyclone.id}</p>
        </div>
        <IntensityBadge classification={cyclone.classification} />
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        borderBottom: '2px solid #e2e8f0', 
        marginBottom: '1.5rem' 
      }}>
        <button
          onClick={() => setActiveTab('telemetry')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: '600',
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'telemetry' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'telemetry' ? '#0284c7' : '#64748b',
            transition: 'all 0.2s'
          }}
        >
          Telemetry & Tracking
        </button>
        <button
          onClick={() => setActiveTab('satellite')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: '600',
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'satellite' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'satellite' ? '#0284c7' : '#64748b',
            transition: 'all 0.2s'
          }}
        >
          Satellite Loop
        </button>
      </div>

      {/* Tab 1: Live Telemetry & Tracking Map */}
      {activeTab === 'telemetry' && (
        <>
          <div className="dashboard-grid">
            <div className="map-column">
              <MapView cyclone={cyclone} />
            </div>
            <div>
              <CycloneDetails cyclone={cyclone} />
            </div>
          </div>
          <ComparisonTable currentCyclone={cyclone} />
        </>
      )}

      {/* Tab 2: Sized Satellite Loop Viewer */}
      {activeTab === 'satellite' && (
        <SatelliteImage key={cyclone.id} cyclone={cyclone} />
      )}
    </div>
  );
}