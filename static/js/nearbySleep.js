// nearbySleep.js - Handles finding and displaying nearby hotels & shelters

import { getMap } from './map.js';

let hotels = [];
let shelters = [];
let sleepMarkers = [];

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
 * Find the top 10 closest sleeping spots for each segment point.
 * @param {Array} segmentPoints - List of [lng, lat] points.
 * @param {number} radiusKm - Search radius in km.
 * @returns {Array} Sorted sleeping spots per segment.
 */
export function findNearbySleepingSpots(segmentPoints, radiusKm = 5) {
    let results = [];

    segmentPoints.forEach(segmentPoint => {
        // Calculate distances to all hotels and shelters
        let allAccommodations = [...hotels, ...shelters].map(place => ({
            name: place.name,
            coords: place.coords,
            distance: getDistance(segmentPoint, place.coords) // Distance in meters
        }));

        // Sort by proximity
        allAccommodations.sort((a, b) => a.distance - b.distance);

        // Limit to 10 closest places
        let closestPlaces = allAccommodations.slice(0, 5);

        results.push({
            segment: segmentPoint,
            accommodations: closestPlaces
        });
    });

    return results;
}



/**
 * Plot the closest sleeping spots on the map near segment points.
 * @param {Array} sleepingSpots - List of sorted accommodations per segment.
 */
export function plotSleepingSpots(sleepingSpots) {
    // Remove old markers
    sleepMarkers.forEach(marker => marker.remove());
    sleepMarkers = [];

    sleepingSpots.forEach(({ segment, accommodations }) => {
        accommodations.forEach(place => {
            const marker = new mapboxgl.Marker({
                color: place.name.includes("Hotel") ? "blue" : "green"
            })
            .setLngLat(place.coords)
            .setPopup(new mapboxgl.Popup().setHTML(`
                <b>${place.name}</b><br>
                Distance: ${(place.distance / 1000).toFixed(2)} km
            `))
            .addTo(getMap());

            sleepMarkers.push(marker);
        });
    });
}


/**
 * Function to calculate distance between two coordinates.
 * Uses Haversine formula.
 * @param {Array} coord1 - [lng, lat] of first point.
 * @param {Array} coord2 - [lng, lat] of second point.
 * @returns {number} Distance in meters.
 */
function getDistance(coord1, coord2) {
    const R = 6371000; // Radius of Earth in meters
    const lat1 = (coord1[1] * Math.PI) / 180;
    const lat2 = (coord2[1] * Math.PI) / 180;
    const deltaLat = lat2 - lat1;
    const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Update the sidebar with the closest sleeping spots.
 * @param {Array} sleepingSpots - List of sorted accommodations per segment.
 */
function updateSleepSpotsList(sleepingSpots) {
    const sleepSpotsList = document.getElementById("sleepSpotsList");
    
    // Clear previous results
    sleepSpotsList.innerHTML = "";

    if (sleepingSpots.length === 0) {
        sleepSpotsList.innerHTML = "<p>No sleeping spots found.</p>";
        return;
    }

    sleepingSpots.forEach(({ segment, accommodations }, index) => {
        const segmentHeader = document.createElement("h4");
        segmentHeader.textContent = `Segment ${index + 1}`;
        sleepSpotsList.appendChild(segmentHeader);

        const spotList = document.createElement("ul");

        accommodations.forEach((place, i) => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `<b>#${i + 1}</b> - ${place.name} (${(place.distance / 1000).toFixed(2)} km)`;
            spotList.appendChild(listItem);
        });

        sleepSpotsList.appendChild(spotList);
    });
}

export { updateSleepSpotsList };

