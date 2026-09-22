import { promisify } from 'util';
import { exec as execCallback } from 'node:child_process';

import path from 'path';
import fs from "fs";
import {Blob} from "buffer"; 

const exec = promisify(execCallback);
/**
 * MOCK: Simulates calling your custom AI classification model
 */
export async function callClassificationModel(imagePath) {
    try {
        // 1. Read the file synchronously into a Buffer
        const fileBuffer = fs.readFileSync(imagePath);
        
        // 2. Convert the Buffer into a native Blob
        const blob = new Blob([fileBuffer], { type: 'image/png' });
        
        // 3. Initialize native FormData
        const formData = new FormData();
        
        // 4. Append the Blob and explicitly provide the 'file' key and the filename
        const fileName = path.basename(imagePath);
        formData.append('file', blob, fileName);

        // 5. Send the POST request
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
            classification: "Tropical Cyclone", 
            destructive_scale_raw: data.prediction, 
            confidence: data.confidence,
            probabilities: data.probabilities
        };

    } catch (error) {
        console.error("Classification Model API failed:", error.message);
        
        return {
            classification: "Unknown",
            destructive_scale_raw: "LOW",
            confidence: 0
        };
    }
}

/**
 * MOCK: Simulates calling a weather API (e.g., Open-Meteo) using extracted coordinates
 */
/* async function fetchMeteorologicalData(lat, lon, timestamp) {
    try {
        // Using Open-Meteo, a free, open-source weather API that requires no authentication key.
        // We request current surface pressure (hPa) and wind speed (km/h) at the exact coordinates.
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=surface_pressure,wind_speed_10m&wind_speed_unit=kmh`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Open-Meteo API returned status: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            // General weather APIs don't track named storms. You would need a specialized 
            // registry (like NOAA's IBTrACS or an IMD dataset) to match coordinates to a name.
            cyclone_name: "Unnamed System", 
            pressure_hpa: data.current.surface_pressure,
            wind_speed_kmh: data.current.wind_speed_10m,

            // Storm surge requires complex coastal bathymetry models (like SLOSH). 
            // Standard APIs cannot calculate this purely from a mid-ocean lat/lon.
            surge_estimate_m: null 
        };
        
    } catch (error) {
        console.error("Meteorological API fetch failed:", error.message);
        // Graceful fallback so the database insertion doesn't crash the pipeline
        return {
            cyclone_name: "Unknown",
            pressure_hpa: null,
            wind_speed_kmh: null,
            surge_estimate_m: null
        };
    }
} */
// For simulation, we are using historical data. Later, for real-time data, 
// we should shift to the above commented function.
//Tested
async function fetchMeteorologicalData(lat, lon, timestamp) {
    try {
        // 1. Parse the extracted timestamp (e.g., "16 MAY 2013 08:45:00 UTC")
        const targetDate = new Date(timestamp);
        if (isNaN(targetDate.getTime())) {
            throw new Error(`Invalid timestamp format received: ${timestamp}`);
        }

        // 2. Format date to YYYY-MM-DD for the API
        const dateString = targetDate.toISOString().split('T')[0];
        
        // 3. Use the Open-Meteo Historical Archive API, fetching hourly data for that single day
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateString}&end_date=${dateString}&hourly=surface_pressure,wind_speed_10m`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Open-Meteo Archive API returned status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 4. Extract the exact hour from our timestamp (0-23)
        // This acts as the index for the arrays returned by Open-Meteo
        const hourIndex = targetDate.getUTCHours();
        
        return {
            cyclone_name: "Unnamed System", 
            
            // Map the hourly array index to get the value for the specific time
            pressure_hpa: data.hourly.surface_pressure[hourIndex],
            wind_speed_kmh: data.hourly.wind_speed_10m[hourIndex],
            
            surge_estimate_m: null 
        };
        
    } catch (error) {
        console.error("Historical meteorological API fetch failed:", error.message);
        
        return {
            cyclone_name: "Unknown",
            pressure_hpa: null,
            wind_speed_kmh: null,
            surge_estimate_m: null
        };
    }
}

/**
 * Executes the Python script to extract image data --Tested
 */
async function extractDataFromImage(imageUrl) {
    try {
        // Await the execution of the Python script directly
        const { stdout, stderr } = await exec(`python extract_data.py "${imageUrl}"`);
        
        // Parse the output
        const data = JSON.parse(stdout.trim());
        
        // Catch custom errors returned by the Python script
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data;
        
    } catch (error) {
        // This catches execution errors (like command not found) AND JSON parsing errors
        throw new Error(`Extraction failed: ${error.message} | Stdout: ${error.stdout || ''} | Stderr: ${error.stderr || ''}`);
    }
}

/**
 * Master function to process the image URL and format the final DB object
 */
export async function generateDatabasePayload(imageUrl) {
    try {
        // 1. Run AI classification and Python extraction concurrently
        const [modelData, imageData] = await Promise.all([
            callClassificationModel(imageUrl),
            extractDataFromImage(imageUrl)
        ]);

        // 2. Fetch external meteorological data using extracted coordinates
        const meteoData = await fetchMeteorologicalData(imageData.lat, imageData.lon, imageData.timestamp);

        /// 3. Convert destructive scale to integer
        const scaleMapping = { "LOW": 1, "MEDIUM": 3, "HIGH": 5 };
        const destructiveScaleInt = scaleMapping[modelData.destructive_scale_raw] || 0;

        // 4. Determine status based on confidence score (Updated Logic)
        const activeStatus = modelData.probabilities["HIGH"] > 0.75 ? "Rapid Monitoring" : "Monitoring";

        // 5. Construct the final unified object matching DB requirements
        const finalDbPayload = {
            cyclone: {
                name: meteoData.cyclone_name,
                wind_speed: meteoData.wind_speed_kmh,
                central_pressure: meteoData.pressure_hpa,
                destructive_scale: destructiveScaleInt,
                status: activeStatus, // Injects 'Rapid Monitoring' or 'Monitoring'
                region: imageData.region,
                formation_date: new Date().toISOString().split('T')[0],
                classification: modelData.destructive_scale_raw, 
            },
            tracking: {
                recorded_at: imageData.timestamp,
                latitude: imageData.lat,
                longitude: imageData.lon,
                record_type: "past",
                surge_estimate: meteoData.surge_estimate_m
            }
        };

        return finalDbPayload;

    } catch (error) {
        console.error("Pipeline Failed:", error);
        throw error;
    }
}

// Example usage
/* const testUrl = "https://example.com/satellite_cyclone.gif";
generateDatabasePayload(testUrl).then(payload => {
        console.log("Ready for Database Insertion:");
        console.log(JSON.stringify(payload, null, 2));
}); */


/* //test
const testImageUrl = "C:/Users/prana/Desktop/Projects/Hackathon/cyclone/backend/images/frame_0000.png";

// Create a self-executing async function to properly await the result
(async () => {
    console.log("Starting data extraction...");
    
    try {
        // Await forces JavaScript to pause here until the Python script finishes
        const finalData = await extractDataFromImage(testImageUrl);
        
        console.log("✅ Extraction Successful! Here is the data:");
        console.log(JSON.stringify(finalData, null, 2));
        
    } catch (error) {
        console.error("❌ Pipeline Failed:");
        console.error(error.message);
    }
})(); */
/* 
const result = await fetchMeteorologicalData(13.28, 83.82, "16 MAY 2013 00:00:00 UTC");
console.log(result); */
/* 
const result = await callClassificationModel("C:/Users/prana/Desktop/Projects/Hackathon/cyclone/backend/images/frame_0000.png");
console.log(result); */


/* const result = await generateDatabasePayload("C:/Users/prana/Desktop/Projects/Hackathon/cyclone/backend/images/frame_0000.png");
console.log(result); */