// dataCollector.js

// Adjust this base URL depending on your deployment environment (e.g., 'https://api.yourdomain.com')
const API_URL = 'http://localhost:3000/api/cyclones';

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
                // Add authorization headers here if you secure your API later
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