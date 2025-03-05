// nearbySleep.js - Handles loading hotels & shelters for itinerary planning

import { getMap } from './map.js';

let hotels = [];
let shelters = [];

/**
 * Load sleeping locations from GeoJSON files.
 */
export async function loadSleepingLocations() {
    try {
        const hotelResponse = await fetch('/static/data/denmark_hotels.geojson');
        const shelterResponse = await fetch('/static/data/denmark_shelters.geojson');
        
        const hotelData = await hotelResponse.json();
        const shelterData = await shelterResponse.json();

        hotels = hotelData.features.map(f => ({
            name: f.properties.name || "Unknown Hotel",
            coords: f.geometry.coordinates
        }));

        shelters = shelterData.features.map(f => ({
            name: f.properties.name || "Unknown Shelter",
            coords: f.geometry.coordinates
        }));

        console.log("Hotels & Shelters Loaded:", hotels.length, shelters.length);
    } catch (error) {
        console.error("Error loading sleeping locations:", error);
    }
}

/**
 * Return the combined list of lodging locations.
 */
export function getLodgingList() {
    return [...hotels, ...shelters];
}

/**
 * Helper function to calculate distance between two coordinates.
 * Uses the Haversine formula.
 * @param {Array} coord1 - [lng, lat] of the first point.
 * @param {Array} coord2 - [lng, lat] of the second point.
 * @returns {number} Distance in meters.
 */
export function getDistance(coord1, coord2) {
    const R = 6371000; // Earth radius in meters
    const lat1 = (coord1[1] * Math.PI) / 180;
    const lat2 = (coord2[1] * Math.PI) / 180;
    const deltaLat = lat2 - lat1;
    const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;
    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
