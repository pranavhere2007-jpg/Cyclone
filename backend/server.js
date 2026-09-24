import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import cors from 'cors';
import { fetchUnifiedCycloneData } from './db_connect.js';

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// 1. Define folder paths FIRST
const simulatorImagesDir = path.resolve(__dirname, '..', 'simulator', 'images');
const uploadsDir = path.join(__dirname, 'uploads');
console.log("-----------------------------------------");
console.log("Checking path:", simulatorImagesDir);
console.log("Folder exists?", fs.existsSync(simulatorImagesDir));
if (fs.existsSync(simulatorImagesDir)) {
  console.log("Folder contents:", fs.readdirSync(simulatorImagesDir));
}
console.log("-----------------------------------------");
// 2. Ensure both folders exist on disk
if (!fs.existsSync(simulatorImagesDir)) fs.mkdirSync(simulatorImagesDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// 3. Expose static image endpoints
app.use('/images', express.static(simulatorImagesDir)); 
app.use('/uploads', express.static(uploadsDir));
// Configure Multer storage for uploaded satellite frames
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, staticImageDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `satellite-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// Coastal monitoring reference cities
const TAGGED_LOCATIONS = [
    { name: "Chennai", lat: 13.0827, lon: 80.2707, basin: "Bay of Bengal" },
    { name: "Kochi", lat: 9.9312, lon: 76.2673, basin: "Arabian Sea" },
    { name: "Visakhapatnam", lat: 17.6868, lon: 83.2185, basin: "Bay of Bengal" },
    { name: "Mumbai", lat: 19.0760, lon: 72.8777, basin: "Arabian Sea" },
    { name: "Kolkata", lat: 22.5726, lon: 88.3639, basin: "Bay of Bengal" },
    { name: "Panaji", lat: 15.4909, lon: 73.8278, basin: "Arabian Sea" }
];

/**
 * 1. POST /api/satellite/upload
 * Process new satellite images and run the OCR + database pipeline.
 */
app.post('/api/satellite/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
    }

    try {
        const absoluteImagePath = path.resolve(__dirname, req.file.path);
        console.log(`Received new satellite image: ${absoluteImagePath}`);

        const scriptPath = path.join(__dirname, 'db_insert.js');
        const { stdout, stderr } = await execAsync(`node "${scriptPath}" "${absoluteImagePath}"`);

        if (stderr) console.error("Pipeline Warnings:", stderr);

        res.status(200).json({ 
            message: 'Image processed and database updated successfully.',
            image_url: `http://localhost:${PORT}/uploads/${req.file.filename}`,
            pipeline_log: stdout 
        });

    } catch (error) {
        console.error('Pipeline execution failed:', error.message);
        res.status(500).json({ 
            error: 'Failed to process satellite image',
            details: error.message 
        });
    }
});

/**
 * 2. GET /api/cyclones
 * Retrieve unified cyclone data from database.
 */
app.get('/api/cyclones', async (req, res) => {
    try {
        const cycloneData = await fetchUnifiedCycloneData();
        res.status(200).json(cycloneData);
    } catch (error) {
        console.error('Failed to retrieve cyclone data:', error.message);
        res.status(500).json({ error: 'Failed to retrieve cyclone data' });
    }
});

/**
 * 3. GET /api/weather-at-point
 * Fetch live surface wind speed and sea pressure from Open-Meteo.
 */
app.get('/api/weather-at-point', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ error: "Missing required query parameters: lat and lon" });
        }

        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,surface_pressure`;
        const response = await fetch(openMeteoUrl);
        
        if (!response.ok) {
            throw new Error(`Open-Meteo API error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json({
            wind_speed: `${data.current.wind_speed_10m} km/h`,
            pressure: `${data.current.surface_pressure} hPa`
        });
    } catch (error) {
        console.error("Error fetching live point weather:", error.message);
        res.status(500).json({ error: "Failed to fetch weather data for specified location." });
    }
});

/**
 * 4. GET /api/alerts/region
 * Check if a region falls within active hazard alert zone.
 */
app.get('/api/alerts/region', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ error: "Missing required query parameters: lat and lon" });
        }

        const targetLat = parseFloat(lat);
        const targetLon = parseFloat(lon);
        const basin = targetLon > 78.0 ? "Bay of Bengal" : "Arabian Sea";

        const allCyclones = await fetchUnifiedCycloneData();
        const activeAlerts = allCyclones.filter(c => 
            c.status === "Rapid Monitoring" || c.is_alert === true
        );

        const basinAlerts = activeAlerts.filter(c => c.region === basin);

        if (basinAlerts.length > 0) {
            const currentCyclone = basinAlerts[0];
            return res.json({
                at_risk: true,
                basin: basin,
                alert: {
                    cyclone_id: currentCyclone.id,
                    cyclone_name: currentCyclone.name,
                    status: currentCyclone.status,
                    destructive_scale: currentCyclone.destructive_scale,
                    message: `WARNING: Active cyclone activity (${currentCyclone.name}) detected in the ${basin}.`
                }
            });
        }

        res.json({
            at_risk: false,
            basin: basin,
            alert: null
        });

    } catch (error) {
        console.error("Error evaluating regional alerts:", error.message);
        res.status(500).json({ error: "Failed to process regional alert evaluation." });
    }
});

/**
 * 5. GET /api/alerts/tagged-locations
 * Check hazard status across coastal locations.
 */
app.get('/api/alerts/tagged-locations', async (req, res) => {
    try {
        const allCyclones = await fetchUnifiedCycloneData();
        const activeAlerts = allCyclones.filter(c => 
            c.status === "Rapid Monitoring" || c.is_alert === true
        );

        const locationStatuses = TAGGED_LOCATIONS.map(loc => {
            const matchingAlert = activeAlerts.find(c => c.region === loc.basin);
            return {
                name: loc.name,
                lat: loc.lat,
                lon: loc.lon,
                basin: loc.basin,
                at_risk: !!matchingAlert,
                alert_details: matchingAlert ? {
                    cyclone_name: matchingAlert.name,
                    status: matchingAlert.status,
                    destructive_scale: matchingAlert.destructive_scale
                } : null
            };
        });

        res.json(locationStatuses);

    } catch (error) {
        console.error("Error evaluating tagged location alerts:", error.message);
        res.status(500).json({ error: "Failed to evaluate tagged locations alerts." });
    }
});

/**
 * 6. POST /api/predict
 * Proxy endpoint to forward prediction requests to machine learning API.
 */
app.post('/api/predict', async (req, res) => {
    try {
        const response = await fetch('https://cyclonepredictmodel.onrender.com/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Model API failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Proxy Prediction Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch prediction from model' });
    }
});

/**
 * 7. GET /api/latest-satellite-frame
 * Scans simulator/images directory for frame_*.png files and returns the latest image frame.
 */
app.get('/api/all-satellite-frames', (req, res) => {
    fs.readdir(simulatorImagesDir, (err, files) => {
        if (err || !files || files.length === 0) {
            return res.status(404).json({ error: 'No frame images found in simulator directory.' });
        }

        // Filter for frame_*.gif, .png, .jpg, .jpeg files
        const frameFiles = files
            .filter(f => /^frame_.*\.(gif|png|jpg|jpeg)$/i.test(f))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        if (frameFiles.length === 0) {
            return res.status(404).json({ error: 'No frame files matching pattern found.' });
        }

        const frames = frameFiles.map(file => ({
            filename: file,
            image_url: `http://localhost:${PORT}/images/${file}`
        }));

        res.json(frames);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Simulator frames path: ${simulatorImagesDir}`);
    console.log(`Uploads path: ${uploadsDir}`);
});