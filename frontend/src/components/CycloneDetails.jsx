export default function CycloneDetails({ cyclone }) {
  // Guard against null/undefined cyclone during data fetch
  if (!cyclone) return null;

  // Derive storm surge directly without useEffect or extra state
  let surgeValue = '--';
  if (cyclone.surge_estimate) {
    surgeValue = `${cyclone.surge_estimate} ${cyclone.surge_unit || 'm'}`;
  } else if (cyclone.wind_speed || cyclone.max_sustained_wind) {
    const speed = parseFloat(cyclone.wind_speed || cyclone.max_sustained_wind);
    surgeValue = `${(speed * 0.05).toFixed(1)} m`;
  }
return (
    <div className="card" style={{ height: '100%' }}>
      <h3 className="card-title" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: '1rem' }}>
        Current Telemetry
      </h3>
      
      <div>
        <div className="telemetry-row">
          <span className="telemetry-label">Max Sustained Wind</span>
          <span className="telemetry-value danger">
             {cyclone.wind_speed || '--'} {cyclone.wind_speed_unit}
          </span>
        </div>
        
        <div className="telemetry-row">
          <span className="telemetry-label">Central Pressure</span>
          <span className="telemetry-value">
             {cyclone.pressure || '--'} {cyclone.pressure_unit}
          </span>
        </div>
        
        <div className="telemetry-row">
          <span className="telemetry-label">Destructive Scale</span>
          <span className="badge badge-severe">
            Category {cyclone.destructive_scale || '0'}
          </span>
        </div>
        
        <div className="telemetry-row">
  <span className="telemetry-label">Est. Storm Surge</span>
  <span className="telemetry-value" style={{ color: 'var(--primary)' }}>
    {cyclone.surge_estimate 
      ? `${cyclone.surge_estimate} ${cyclone.surge_unit || 'm'}` 
      : cyclone.wind_speed 
        ? `${(parseFloat(cyclone.wind_speed) * 0.05).toFixed(1)} m` 
        : '--'}
  </span>
</div>

        <div className="telemetry-row">
          <span className="telemetry-label">Current Status</span>
          <span className="telemetry-value" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', textTransform: 'capitalize' }}>
            {cyclone.status === 'active' && <span className="status-pulse"></span>}
            {cyclone.status || 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}