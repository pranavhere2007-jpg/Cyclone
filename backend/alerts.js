// alerts.js
import express from 'express';
import pool from './db_connect.js';

const router = express.Router();

// Fixed list of monitored coastal locations
const MONITORED_LOCATIONS = [
  { location: "Chennai", lat: 13.08, lon: 80.27 },
  { location: "Kochi", lat: 9.93, lon: 76.27 },
  { location: "Visakhapatnam", lat: 17.68, lon: 83.22 },
  { location: "Mumbai", lat: 19.07, lon: 72.87 },
  { location: "Bhubaneswar", lat: 20.29, lon: 85.82 },
  { location: "Kolkata", lat: 22.57, lon: 88.36 },
];

const RISK_THRESHOLD_KM = 300;

// Haversine distance in km between two lat/lon points
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.get('/tagged-locations', async (_req, res) => {
  try {
    // Get latest tracking point for each active cyclone
    const query = `
      SELECT DISTINCT ON (ct.cyclone_id)
        ct.cyclone_id, ct.latitude, ct.longitude, ct.wind_speed,
        ct.central_pressure, ct.recorded_at,
        c.name, c.region, c.status
      FROM cyclone_tracking ct
      JOIN cyclones c ON c.id = ct.cyclone_id
      WHERE c.status != 'Dissipated'
      ORDER BY ct.cyclone_id, ct.recorded_at DESC;
    `;
    const { rows: activeCyclones } = await pool.query(query);

    const result = MONITORED_LOCATIONS.map(loc => {
      let nearest = null;
      let minDist = Infinity;

      for (const cyclone of activeCyclones) {
        const dist = getDistanceKm(loc.lat, loc.lon, cyclone.latitude, cyclone.longitude);
        if (dist < minDist) {
          minDist = dist;
          nearest = cyclone;
        }
      }

      const at_risk = nearest !== null && minDist <= RISK_THRESHOLD_KM;

      return {
        location: loc.location,
        lat: loc.lat,
        lon: loc.lon,
        at_risk,
        distance_km: nearest ? Math.round(minDist) : null,
        alert: at_risk ? {
          name: nearest.name,
          region: nearest.region,
          status: nearest.status,
          wind_speed: nearest.wind_speed,
          central_pressure: nearest.central_pressure,
        } : null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching alerts:', err.message);
    res.status(500).json({ error: 'Failed to fetch alert data' });
  }
});

export default router;