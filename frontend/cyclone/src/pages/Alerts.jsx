import { useState, useEffect } from 'react';

export default function Alerts() {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/alerts/tagged-locations')
      .then((res) => res.json())
      .then((data) => setLocations(data))
      .catch((err) => console.error('Error fetching tagged locations:', err));
  }, []);

  return (
    <div className="card">
      <h2 className="page-title">Regional Hazard Alerts</h2>
      <div className="table-container">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Coastal City</th>
              <th>Basin</th>
              <th>Status</th>
              <th>Active Hazard Details</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <tr key={loc.name}>
                <td><strong>{loc.name}</strong></td>
                <td>{loc.basin}</td>
                <td>
                  <span className={`badge ${loc.at_risk ? 'badge-severe' : 'badge-super'}`}>
                    {loc.at_risk ? '🔴 At Risk' : '🟢 Safe'}
                  </span>
                </td>
                <td>
                  {loc.alert_details ? (
                    <span>
                      <strong>{loc.alert_details.cyclone_name}</strong> — {loc.alert_details.status} ({loc.alert_details.destructive_scale})
                    </span>
                  ) : (
                    'No active tropical warnings'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}