// server.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import cors from "cors";

// Because we are using ES Modules, we must manually define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' }));

// Configure Multer to save uploaded files to a local 'uploads' directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Create a unique filename to prevent overwriting
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `satellite-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

/**
 * POST /api/satellite/upload
 * Endpoint for the satellite simulator to push new images.
 * Expects a multipart/form-data request with the image under the key 'image'.
 */
app.post('/api/satellite/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
    }

    try {
        // Dynamically get the absolute path of the newly saved image
        const absoluteImagePath = path.resolve(__dirname, req.file.path);
        
        console.log(`Received new satellite image: ${absoluteImagePath}`);
        console.log('Triggering data extraction and database insertion pipeline...');

        // Call db_insert.js as a child process with the dynamic file path as an argument
        // Using dynamic pathing for db_insert.js as well to ensure it runs correctly on any host
        const scriptPath = path.join(__dirname, 'db_insert.js');
        const { stdout, stderr } = await execAsync(`node "${scriptPath}" "${absoluteImagePath}"`);

        console.log(stdout);
        if (stderr) console.error("Pipeline Warnings:", stderr);

        res.status(200).json({ 
            message: 'Image processed and database updated successfully.',
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
 * GET /api/cyclones
 * Retrieves the unified cyclone data including past tracking history.
 * (Assuming you have migrated db.js to export fetchUnifiedCycloneData as an ES module)
 */
import { fetchUnifiedCycloneData } from './db_connect.js'; 

app.get('/api/cyclones', async (req, res) => {
    try {
        const cycloneData = await fetchUnifiedCycloneData();
        res.status(200).json(cycloneData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve cyclone data' });
    }
});

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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Simulator Upload Endpoint: POST http://localhost:${PORT}/api/satellite/upload`);
});