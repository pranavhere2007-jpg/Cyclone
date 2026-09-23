import { promisify } from 'util';
import { exec as execCallback } from 'node:child_process';
import path from 'path';
import fs from 'fs';
import { Blob } from 'buffer';

const exec = promisify(execCallback);

export async function callClassificationModel(imagePath) {
  try {
    const fileBuffer = fs.readFileSync(imagePath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    const formData = new FormData();
    const fileName = path.basename(imagePath);
    formData.append('file', blob, fileName);

    const response = await fetch('https://models-ujxx.onrender.com/predict/ir', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Model API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return {
      classification: 'Tropical Cyclone',
      destructive_scale_raw: data.prediction,
      confidence: data.confidence,
      probabilities: data.probabilities || {},
    };
  } catch (error) {
    console.error('Classification Model API failed:', error.message);
    return {
      classification: 'Unknown',
      destructive_scale_raw: 'LOW',
      confidence: 0,
      probabilities: {},
    };
  }
}

async function fetchMeteorologicalData(lat, lon, timestamp) {
  try {
    const targetDate = new Date(timestamp);
    if (isNaN(targetDate.getTime())) {
      throw new Error(`Invalid timestamp format received: ${timestamp}`);
    }

    const dateString = targetDate.toISOString().split('T')[0];
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateString}&end_date=${dateString}&hourly=surface_pressure,wind_speed_10m`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo Archive API status: ${response.status}`);

    const data = await response.json();
    const hourIndex = targetDate.getUTCHours();

    return {
      cyclone_name: 'Unnamed System',
      pressure_hpa: data.hourly.surface_pressure[hourIndex],
      wind_speed_kmh: data.hourly.wind_speed_10m[hourIndex],
      surge_estimate_m: null,
    };
  } catch (error) {
    console.error('Historical meteorological API fetch failed:', error.message);
    return {
      cyclone_name: 'Unknown',
      pressure_hpa: null,
      wind_speed_kmh: null,
      surge_estimate_m: null,
    };
  }
}

async function extractDataFromImage(imagePath) {
  try {
    const { stdout } = await exec(`python extract_data.py "${imagePath}"`);
    const data = JSON.parse(stdout.trim());
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    throw new Error(`Extraction failed: ${error.message}`);
  }
}

export async function generateDatabasePayload(imagePath, imagePublicUrl = null) {
  try {
    const [modelData, imageData] = await Promise.all([
      callClassificationModel(imagePath),
      extractDataFromImage(imagePath),
    ]);

    const meteoData = await fetchMeteorologicalData(imageData.lat, imageData.lon, imageData.timestamp);

    const scaleMapping = { LOW: 1, MEDIUM: 3, HIGH: 5 };
    const destructiveScaleInt = scaleMapping[modelData.destructive_scale_raw] || 0;

    const activeStatus = modelData.probabilities['HIGH'] > 0.75 ? 'Rapid Monitoring' : 'Monitoring';
    const isAlert = activeStatus === 'Rapid Monitoring';

    return {
      cyclone: {
        name: meteoData.cyclone_name,
        wind_speed: meteoData.wind_speed_kmh,
        central_pressure: meteoData.pressure_hpa,
        destructive_scale: destructiveScaleInt,
        status: activeStatus,
        is_alert: isAlert,
        region: imageData.region,
        formation_date: new Date().toISOString().split('T')[0],
        classification: modelData.destructive_scale_raw,
      },
      tracking: {
        recorded_at: imageData.timestamp,
        latitude: imageData.lat,
        longitude: imageData.lon,
        record_type: 'past',
        surge_estimate: meteoData.surge_estimate_m,
        image_url: imagePublicUrl,
      },
    };
  } catch (error) {
    console.error('Pipeline Failed:', error);
    throw error;
  }
}