// route.js – Fetch a route from the backend and draw it on the map
import { loadSleepingLocations, findNearbySleepingSpots, plotSleepingSpots, updateSleepSpotsList } from './nearbySleep.js';

import { getMap } from './map.js';
import { getStartCoords, getEndCoords } from './geocoder.js';

// Load sleeping locations on startup
loadSleepingLocations();


export function drawRouteOnMap(route) {
  const map = getMap();
  
  // Remove any existing route
  if (map.getSource('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }
  
  map.addSource('route', {
    type: 'geojson',
    data: route.points
  });
  
  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#1DB954',
      'line-width': 8
    }
  });
  
  const coordinates = route.points.coordinates;
  const bounds = coordinates.reduce((bounds, coord) => bounds.extend(coord),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
  );
  map.fitBounds(bounds, { padding: 20 });
}

export function initRouteFetcher() {
  const map = getMap();

  document.getElementById('getRoute').addEventListener('click', function () {
    const startCoords = getStartCoords();
    const endCoords = getEndCoords();
    if (!startCoords || !endCoords) {
      alert("Please select both start and end locations.");
      return;
    }

    // Retrieve user input
    const dailyDistance = parseFloat(document.getElementById('dailyDistance').value); // New input field for daily segment length
    if (isNaN(dailyDistance) || dailyDistance <= 0) {
      alert("Please enter a valid daily biking distance.");
      return;
    }

    const maxSpeed = parseFloat(document.getElementById('maxSpeed').value);
    const Tertiary = document.getElementById('Tertiary').value;
    const Secondary = document.getElementById('Secondary').value;
    const Primary = document.getElementById('Primary').value;
    const BikeNetwork = document.getElementById('BikeNetwork').value;
    const Surface = document.getElementById('Surface').value;

    const customModel = {
      priority: [
        { "if": "road_class == TERTIARY", "multiply_by": Tertiary },
        { "if": "road_class == SECONDARY", "multiply_by": Secondary },
        { "if": "road_class == PRIMARY", "multiply_by": Primary },
        { "if": "bike_network == MISSING", "multiply_by": BikeNetwork },
        { "if": "surface == GRAVEL", "multiply_by": Surface }
      ]
    };

    const requestBody = {
      start: startCoords,
      end: endCoords,
      max_speed: maxSpeed,
      custom_model: customModel
    };

    fetch('/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert("Error: " + data.error);
          return;
        }

        const route = data.paths[0];
        drawRouteOnMap(route);

        // Step 1: Find segment points
        const segmentPoints = getDailySegments(route, dailyDistance);
        plotSegmentMarkers(segmentPoints);

        // Step 2: Find nearby sleeping spots
        const sleepingSpots = findNearbySleepingSpots(segmentPoints);
        plotSleepingSpots(sleepingSpots);
        // Step 3: Update sidebar
        updateSleepSpotsList(sleepingSpots);

      })
      .catch(error => {
        console.error("Error fetching route:", error);
        alert("Failed to fetch route. See console for details.");
      });
  });
}

/**
 * Function to divide route into segments based on user-defined distance.
 * @param {Object} route - The route object from Graphhopper.
 * @param {number} dailyDistance - User-defined daily biking distance in km.
 * @returns {Array} Array of segment points (latitude, longitude).
 */
function getDailySegments(route, dailyDistance) {
  const segmentPoints = [];
  let traveledDistance = 0;
  const targetDistance = dailyDistance * 1000; // Convert km to meters

  const coordinates = route.points.coordinates;
  for (let i = 1; i < coordinates.length; i++) {
    const prevPoint = coordinates[i - 1];
    const currentPoint = coordinates[i];

    const distanceBetween = getDistance(prevPoint, currentPoint);
    traveledDistance += distanceBetween;

    if (traveledDistance >= targetDistance) {
      segmentPoints.push(currentPoint);
      traveledDistance = 0; // Reset counter for the next segment
    }
  }
  return segmentPoints;
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

// Array to store markers
let segmentMarkers = [];

/**
 * Function to plot markers at segment points and remove old ones.
 * @param {Array} segmentPoints - Array of [lng, lat] points.
 */
function plotSegmentMarkers(segmentPoints) {
    // Remove old markers
    segmentMarkers.forEach(marker => marker.remove());
    segmentMarkers = [];

    // Add new markers
    segmentPoints.forEach(point => {
        const marker = new mapboxgl.Marker({ color: "red" })
            .setLngLat(point)
            .setPopup(new mapboxgl.Popup().setHTML("Suggested Stop"))
            .addTo(getMap());

        segmentMarkers.push(marker);
    });
}


