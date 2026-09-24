// src/data/dataCollector.js

const API_URL = 'http://localhost:3000/api/cyclones';
const BACKEND_URL = new URL(API_URL).origin;

/**
 * Converts the image reference returned by the API into a valid public URL
 * exposed by the backend's static route (/uploads or /images).
 */
export function getSatelliteImageUrl(imageReference) {
    if (!imageReference) return null;

    const reference = String(imageReference).trim();

    // 1. Return full HTTP/HTTPS URLs as-is
    if (/^https?:\/\//i.test(reference)) {
        return reference;
    }

    // 2. Remove leading slashes
    const cleanRef = reference.replace(/^\/+/, '');

    // 3. Extract pure filename
    const filename = cleanRef.split('/').filter(Boolean).pop();
    if (!filename) return null;

    // 4. Route frame_* images to /images/ and user uploads to /uploads/
    if (/^frame_/i.test(filename)) {
        return `${BACKEND_URL}/images/${filename}`;
    }

    return `${BACKEND_URL}/uploads/${filename}`;
}

/**
 * Fetches the complete cyclone dataset from the backend server.
 * 
 * @returns {Promise<Array|null>} The array of cyclone data objects, or null if the request fails.
 */
export async function fetchCycloneData() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Failed to retrieve cyclone data from the backend:', error);
        return null;
    }
}