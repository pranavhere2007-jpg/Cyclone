export default function ComparisonTable({ currentCyclone }) {
  // Accommodate key variations returned by Supabase/Express
  const logData = 
    currentCyclone?.pastdata || 
    currentCyclone?.pastData || 
    currentCyclone?.past_data || 
    [];

  return (
    <div className="card" style={{ marginTop: '2.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 className="card-title">Cyclone Telemetry History</h3>
        <p className="card-subtitle">Live log of past positions, intensity, and active scan modes.</p>
      </div>
      
      <div className="table-container">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Coordinates (Lat, Lon)</th>
              <th>Status</th>
              <th>Wind (km/h)</th>
              <th>Pressure (hPa)</th>
              <th>Scale</th>
            </tr>
          </thead>
          <tbody>
            {logData.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  Awaiting telemetry data...
                </td>
              </tr>
            ) : (
              [...logData].reverse().map((entry, index) => {
                // Safe date formatting
                let timeString = '--:--:--';
                if (entry?.timestamp) {
                  const date = new Date(entry.timestamp);
                  if (!isNaN(date.getTime())) {
                    timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  } else {
                    timeString = String(entry.timestamp);
                  }
                }

                // Safe coordinate checks
                const lat = entry?.lat !== null && entry?.lat !== undefined ? parseFloat(entry.lat).toFixed(2) : '--';
                const lon = entry?.lon !== null && entry?.lon !== undefined ? parseFloat(entry.lon).toFixed(2) : '--';

                return (
                  <tr key={entry?.id || index} className={index === 0 ? "current-row" : ""}>
                    <td style={{ fontWeight: 600 }}>{timeString}</td>
                    <td>{lat}°, {lon}°</td>
                    <td style={{ textTransform: 'capitalize' }}>{entry?.status || 'N/A'}</td>
                    <td className={index === 0 ? "danger-text" : ""}>
                      {entry?.wind_speed || entry?.wind || 'N/A'}
                    </td>
                    <td>{entry?.pressure || 'N/A'}</td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: '#475569',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {entry?.destructive_scale ? `Cat ${entry.destructive_scale}` : 'CAT 1'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}