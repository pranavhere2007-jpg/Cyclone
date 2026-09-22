import {Pool} from "pg";

// Initialize the PostgreSQL connection pool. 
// It is best practice to manage credentials via environment variables.
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Cyclone',
  password: process.env.DB_PASSWORD || 'user123',
  port: process.env.DB_PORT || 5432,
});

/**
 * Executes the unified SQL query to retrieve current cyclone details 
 * along with a nested array of past tracking data.
 * 
 * @returns {Promise<Array>} The formatted array of cyclone data objects.
 */
export async function fetchUnifiedCycloneData() {
  const query = `
    WITH LatestTracking AS (
        SELECT DISTINCT ON (cyclone_id)
            cyclone_id,
            latitude AS current_lat,
            longitude AS current_lon,
            recorded_at AS last_updated_at
        FROM cyclone_tracking
        ORDER BY cyclone_id, recorded_at DESC
    ),
    FirstDetection AS (
        SELECT 
            cyclone_id, 
            MIN(recorded_at) AS first_detected_at
        FROM cyclone_tracking
        GROUP BY cyclone_id
    ),
    PastDataAggregation AS (
        SELECT
            ct.cyclone_id,
            json_agg(
                json_build_object(
                    'timestamp', ct.recorded_at,
                    'lat', ct.latitude,
                    'lon', ct.longitude,
                    'region', c.region, 
                    'destructive_scale', ct.destructive_scale, 
                    'status', ct.status,                       
                    'pressure', ct.central_pressure,           
                    'wind_speed', ct.wind_speed
                ) ORDER BY ct.recorded_at ASC
            ) AS "pastData"
        FROM cyclone_tracking ct
        JOIN cyclones c ON ct.cyclone_id = c.id
        WHERE ct.record_type = 'past'
        GROUP BY ct.cyclone_id
    )
    SELECT 
        c.classification, 
        lt.current_lat,
        lt.current_lon,
        c.name AS cyclone_name,
        c.destructive_scale,
        fd.first_detected_at,
        c.id,
        lt.last_updated_at,
        c.central_pressure AS pressure,
        'hPa' AS pressure_unit,
        c.region,
        c.status,
        NULL AS surge_estimate,
        'm' AS surge_unit,
        c.wind_speed,
        'km/h' AS wind_speed_unit,
        pda."pastData" 
    FROM cyclones c
    LEFT JOIN LatestTracking lt ON c.id = lt.cyclone_id
    LEFT JOIN FirstDetection fd ON c.id = fd.cyclone_id
    LEFT JOIN PastDataAggregation pda ON c.id = pda.cyclone_id;
  `;

  try {
    // Execute the query using the connection pool
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error executing unified cyclone query:', error);
    throw error;
  }
}

/* const data = await fetchUnifiedCycloneData();
console.log(data); */

// Export the function so it can be called by your API routes or controllers
