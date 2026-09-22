import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCycloneData } from '../data/dataCollector';
import MapView from '../components/MapView';
import IntensityBadge from '../components/IntensityBadge';
import CycloneDetails from '../components/CycloneDetails';
import ComparisonTable from '../components/ComparisonTable'; 
import "../index.css";

export default function Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [cyclone, setCyclone] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      const data = await fetchCycloneData();
      if (data) {
        // Find the specific cyclone matching the route parameter
        const found = data.find(c => c.id.toString() === id);
        setCyclone(found);
      }
      setLoading(false);
    }
    
    loadDashboardData();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ textAlign: 'center', padding: '3rem' }}>
      <h2 className="text-xl font-bold text-gray-500">Retrieving cyclone metrics...</h2>
    </div>
  );

  if (!cyclone) return (
    <div className="flex items-center justify-center h-64" style={{ textAlign: 'center', padding: '3rem' }}>
      <h2 className="text-xl font-bold text-gray-500">Cyclone data not found.</h2>
    </div>
  );

  return (
    <div>
      <button onClick={() => navigate('/')} className="btn-primary">
        &larr; Back to Active List
      </button>

      <div className="card dashboard-header">
        <div>
          <h2 className="page-title" style={{ marginBottom: 0 }}>
            {cyclone.cyclone_name || "Unnamed System"}
          </h2>
          <p className="page-subtitle">ID: {cyclone.id}</p>
        </div>
        <IntensityBadge classification={cyclone.classification} />
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Map */}
        <div className="map-column">
          <MapView cyclone={cyclone} />
        </div>

        {/* Right Column: Details */}
        <div>
          <CycloneDetails cyclone={cyclone} />
        </div>
      </div>

      {/* Historical Comparison */}
      <ComparisonTable currentCyclone={cyclone} />
    </div>
  );
}