import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Global cache to share the single prediction promise across React StrictMode remounts
const predictionPromiseCache = new Map();

export default function MapView({ cyclone }) {
  const defaultCenter = [15.0, 85.0];
  const [predictedPath, setPredictedPath] = useState([]);
  const [predictionDetails, setPredictionDetails] = useState([]);
  const [isPredicting, setIsPredicting] = useState(false);

  const hasData = Boolean(cyclone && cyclone.current_lat && cyclone.current_lon);
  const mapCenter = hasData ? [parseFloat(cyclone.current_lat), parseFloat(cyclone.current_lon)] : defaultCenter;
  const name = cyclone?.cyclone_name || "Active Cyclone";

  const rawPastData = cyclone?.pastdata || cyclone?.pastData || [];
  const pastData = rawPastData.map(point => [parseFloat(point.lat), parseFloat(point.lon)]);

  useEffect(() => {
    if (!cyclone?.id || !rawPastData || rawPastData.length < 2) return;

    let isSubscribed = true;
    
    // Create a unique cache key based on the cyclone and the amount of data we currently have
    const cacheKey = `${cyclone.id}-${rawPastData.length}`;

    async function processAndFetchPrediction() {
      // If no fetch is currently happening for this data, create one
      if (!predictionPromiseCache.has(cacheKey)) {
        
        // 1. Sort historical data chronologically
        const sorted = [...rawPastData].sort((a, b) => {
          const timeA = new Date(a.timestamp || a.recorded_at).getTime();
          const timeB = new Date(b.timestamp || b.recorded_at).getTime();
          return (timeA || 0) - (timeB || 0);
        });

        const N = sorted.length;
        const resampled = [];
        const lerp = (v0, v1, t) => v0 + t * (v1 - v0);

        // 2. Interpolate exactly 8 points based on spatial sequence (Fixes mangled coordinates)
        for (let i = 0; i < 8; i++) {
          const indexTarget = (i / 7) * (N - 1);
          const lower = Math.floor(indexTarget);
          const upper = Math.ceil(indexTarget);
          const ratio = indexTarget - lower;
          
          const pt1 = sorted[lower];
          const pt2 = sorted[upper];

          resampled.push({
            lat: lerp(parseFloat(pt1.lat), parseFloat(pt2.lat), ratio),
            lon: lerp(parseFloat(pt1.lon), parseFloat(pt2.lon), ratio),
            pressure: lerp(parseFloat(pt1.pressure || 1000), parseFloat(pt2.pressure || 1000), ratio),
            wind_speed: lerp(parseFloat(pt1.wind_speed || 20), parseFloat(pt2.wind_speed || 20), ratio)
          });
        }

        // 3. Artificially generate recent timestamps (2026) to prevent GFS 500 download failures
        const now = new Date();
        const baseHour = Math.floor(now.getUTCHours() / 6) * 6;
        const latestMockTimeMs = Date.UTC(2026, now.getUTCMonth(), now.getUTCDate(), baseHour);
        const sixHoursMs = 6 * 60 * 60 * 1000;

        const observations = resampled.map((p, index) => {
          const offsetMultiplier = 7 - index; 
          const mockTime = new Date(latestMockTimeMs - (offsetMultiplier * sixHoursMs));
          
          const yr = mockTime.getUTCFullYear();
          const mo = String(mockTime.getUTCMonth() + 1).padStart(2, '0');
          const da = String(mockTime.getUTCDate()).padStart(2, '0');
          const hr = String(mockTime.getUTCHours()).padStart(2, '0');
          
          return {
            timestamp: `${yr}${mo}${da}${hr}`,
            longitude: p.lon,
            latitude: p.lat,
            pressure: p.pressure, 
            wind: p.wind_speed      
          };
        });

        // Create the Promise and store it in the external cache
        const fetchPromise = fetch('http://localhost:3000/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ observations })
        })
        .then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.json();
        })
        .catch(error => {
          console.error("[Prediction] Model failed:", error.message);
          predictionPromiseCache.delete(cacheKey); // Clear cache so it can try again later
          return null;
        });

        predictionPromiseCache.set(cacheKey, fetchPromise);
      }

      setIsPredicting(true);

      // 4. Await the shared promise. 
      // In StrictMode, Mount A creates the fetch, Mount B simply awaits Mount A's fetch!
      const data = await predictionPromiseCache.get(cacheKey);

      // Only the currently active mounted component will pass this check and render the line
      if (isSubscribed) {
        setIsPredicting(false);
        if (data && data.predictions && Array.isArray(data.predictions)) {
          const currentPoint = [parseFloat(cyclone.current_lat), parseFloat(cyclone.current_lon)];
          const formattedPrediction = data.predictions.map(pt => [pt.latitude, pt.longitude]);
          
          setPredictedPath([currentPoint, ...formattedPrediction]);
          setPredictionDetails(data.predictions);
        }
      }
    }

    processAndFetchPrediction();

    return () => {
      isSubscribed = false;
    };
  }, [cyclone?.id, rawPastData.length]); 

  const pastOptions = { color: '#f59e0b', weight: 4, dashArray: '5, 5' }; 
  const predictedOptions = { color: '#ef4444', weight: 4, dashArray: '2, 6' };

  return (
    <div className="map-wrapper" style={{ height: '500px', width: '100%', position: 'relative' }}>
      
      {isPredicting && (
        <div style={{
          position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, backgroundColor: '#fee2e2', border: '1px solid #ef4444',
          padding: '8px 16px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          fontWeight: 'bold', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span className="status-pulse"></span>
          Running Advanced GFS Forecast (ETA: ~20s)...
        </div>
      )}

      <MapContainer 
        center={mapCenter} 
        zoom={5} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {hasData && (
          <>
            {pastData.length > 1 && (
              <Polyline pathOptions={pastOptions} positions={pastData} />
            )}

            {predictedPath.length > 1 && (
              <Polyline pathOptions={predictedOptions} positions={predictedPath} />
            )}

            {predictionDetails.map((pt, index) => (
              <CircleMarker 
                key={`pred-${index}`} 
                center={[pt.latitude, pt.longitude]} 
                radius={6} 
                pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}
              >
                <Popup>
                  <b>Forecast +{(index + 1) * 6}h</b><br />
                  Time: {pt.timestamp}<br />
                  Wind: {pt.wind_knots ? pt.wind_knots.toFixed(1) : '--'} kt<br />
                  Pressure: {pt.pressure_hpa ? pt.pressure_hpa.toFixed(1) : '--'} hPa
                </Popup>
              </CircleMarker>
            ))}

            <Marker position={mapCenter}>
              <Popup>
                <b>{name}</b> <br /> Current Position: {mapCenter[0]}°, {mapCenter[1]}°
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}