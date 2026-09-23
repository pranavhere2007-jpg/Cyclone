import 'dotenv/config';
import supabase from './db_connect.js';
import { generateDatabasePayload } from './orchestrator.js';
import { fileURLToPath } from 'url';

export async function insertDataIntoDb(payload) {
  const { data: existing, error: findError } = await supabase
    .from('cyclones')
    .select('id')
    .eq('region', payload.cyclone.region)
    .order('formation_date', { ascending: false })
    .limit(1);

  if (findError) throw findError;

  let cycloneId;

  if (existing && existing.length > 0) {
    cycloneId = existing[0].id;
    const { error: updateError } = await supabase
      .from('cyclones')
      .update({
        wind_speed: payload.cyclone.wind_speed,
        central_pressure: payload.cyclone.central_pressure,
        destructive_scale: payload.cyclone.destructive_scale,
        status: payload.cyclone.status,
        classification: payload.cyclone.classification,
      })
      .eq('id', cycloneId);

    if (updateError) throw updateError;
    console.log(`Updated existing cyclone (ID: ${cycloneId}).`);
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('cyclones')
      .insert({
        name: payload.cyclone.name,
        wind_speed: payload.cyclone.wind_speed,
        central_pressure: payload.cyclone.central_pressure,
        destructive_scale: payload.cyclone.destructive_scale,
        status: payload.cyclone.status,
        formation_date: payload.cyclone.formation_date,
        region: payload.cyclone.region,
        classification: payload.cyclone.classification,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;
    cycloneId = inserted.id;
    console.log(`Created new cyclone record (ID: ${cycloneId}).`);
  }

  const { error: trackingError } = await supabase
    .from('cyclone_tracking')
    .upsert(
      {
        cyclone_id: cycloneId,
        recorded_at: payload.tracking.recorded_at,
        latitude: payload.tracking.latitude,
        longitude: payload.tracking.longitude,
        record_type: payload.tracking.record_type,
        wind_speed: payload.cyclone.wind_speed,
        central_pressure: payload.cyclone.central_pressure,
        destructive_scale: payload.cyclone.destructive_scale,
        status: payload.cyclone.status,
        classification: payload.cyclone.classification,
      },
      { onConflict: 'cyclone_id,recorded_at', ignoreDuplicates: true }
    );

  if (trackingError) throw trackingError;

  console.log('Database insertion pipeline completed successfully.');
}

async function processImageAndInsert(imagePath, imagePublicUrl) {
  try {
    console.log(`Processing image: ${imagePath}`);
    const payload = await generateDatabasePayload(imagePath, imagePublicUrl);
    await insertDataIntoDb(payload);
  } catch (error) {
    console.error('Pipeline execution stopped:', error.message);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('db_insert.js')) {
  const imageInput = process.argv[2];
  const imagePublicUrl = process.argv[3] || null;
  if (!imageInput) {
    console.error('Error: Please provide an image path as a CLI argument.');
    process.exit(1);
  }
  processImageAndInsert(imageInput, imagePublicUrl);
}