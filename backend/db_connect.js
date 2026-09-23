import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default supabase;

export async function fetchUnifiedCycloneData() {
  const { data: cyclones, error: cyclonesError } = await supabase
    .from('cyclones')
    .select('*');

  if (cyclonesError) throw cyclonesError;

  const { data: tracking, error: trackingError } = await supabase
    .from('cyclone_tracking')
    .select('*')
    .order('recorded_at', { ascending: true });

  if (trackingError) throw trackingError;

  return cyclones.map(c => {
    const cycloneTracking = tracking.filter(t => t.cyclone_id === c.id);
    const latest = cycloneTracking[cycloneTracking.length - 1] || null;
    const first = cycloneTracking[0] || null;

    const pastData = cycloneTracking
      .filter(t => t.record_type === 'past')
      .map(t => ({
        timestamp: t.recorded_at,
        lat: t.latitude,
        lon: t.longitude,
        region: c.region,
        destructive_scale: t.destructive_scale,
        status: t.status,
        pressure: t.central_pressure,
        wind_speed: t.wind_speed,
        image_url: t.image_url || null,
      }));

    return {
      id: c.id,
      cyclone_name: c.name,
      classification: c.classification,
      current_lat: latest?.latitude ?? null,
      current_lon: latest?.longitude ?? null,
      destructive_scale: c.destructive_scale,
      first_detected_at: first?.recorded_at ?? null,
      last_updated_at: latest?.recorded_at ?? null,
      pressure: c.central_pressure,
      pressure_unit: 'hPa',
      region: c.region,
      status: c.status,
      is_alert: c.is_alert || false,
      surge_estimate: null,
      surge_unit: 'm',
      wind_speed: c.wind_speed,
      wind_speed_unit: 'km/h',
      latest_image_url: latest?.image_url || null,
      pastData,
    };
  });
}