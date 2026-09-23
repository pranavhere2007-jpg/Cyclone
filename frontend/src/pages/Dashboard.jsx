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

  useEffect(() => {
    async function loadData() {
      const data = await fetchCycloneData();
      if (data && data.length > 0) {
        // Find matching cyclone or default to the first record
        const selected = data.find((c) => String(c.id) === String(id)) || data[0];
        setCyclone(selected);
      }
      setLoading(false);
    }
    loadData();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard telemetry...</div>;
  }

  if (!cyclone) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No cyclone telemetry available.</div>;
  }

  return (
    <div>
      <button 
        onClick={() => navigate('/')} 
        className="btn-primary" 
        style={{ marginBottom: '1.5rem', width: 'auto', display: 'inline-block' }}
      >
        &larr; Back to Active List
      </button>

      <div className="card dashboard-header">
        <div>
          <h2 className="page-title" style={{ marginBottom: 0 }}>
            {cyclone.cyclone_name || cyclone.name || "Unnamed System"}
          </h2>
          <p className="page-subtitle">ID: {cyclone.id}</p>
        </div>
        <IntensityBadge classification={cyclone.classification} />
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Interactive Tracking Map */}
        <div className="map-column">
          <MapView cyclone={cyclone} />
        </div>

        {/* Right Column: Telemetry Summary */}
        <div>
          <CycloneDetails cyclone={cyclone} />
        </div>
      </div>

      {/* IR Satellite Image */}
      <SatelliteImage key={cyclone.id} cyclone={cyclone} />

      {/* Single Historical Comparison Table */}
      <ComparisonTable currentCyclone={cyclone} />
    </div>
  );
}