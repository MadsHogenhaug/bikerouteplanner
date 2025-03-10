// route.js
// --------------------------------------------------
// Fetches the route from the backend, draws it on the map,
// and then calls our hybrid itinerary planner to display
// 1 "best" lodging + 4 nearest alternatives per day.
// Exports:
//   initRouteFetcher() - sets up the "Get Route" button
// --------------------------------------------------

import { loadSleepingLocations } from './nearbySleep.js';
import { getMap } from './map.js';
import { getStartCoords, getEndCoords, getViaCoords } from './geocoder.js';
import { planHybridItinerary, plotHybridPlan, updateHybridSidebar } from './itinerary.js';

loadSleepingLocations(); // ensure lodging data is loaded

/**
 * Draw the route line on the map using a GeoJSON "LineString".
 * @param {Object} route - The route object from backend (data.paths[0]).
 */
function drawRouteOnMap(route) {
  const map = getMap();

  // Remove any existing route layer/source first
  if (map.getSource('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }

  map.addSource('route', {
    type: 'geojson',
    data: route.points, // e.g. { type: "LineString", coordinates: [...] }
  });

  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': '#1DB954',
      'line-width': 6,
    },
  });

  // Auto-fit map to route bounds
  const coordinates = route.points.coordinates;
  const bounds = coordinates.reduce(
    (b, coord) => b.extend(coord),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
  );
  map.fitBounds(bounds, { padding: 20 });
}

/**
 * Attach a click handler to the "Get Route" button to:
 *   1) Gather start/end (and via) coordinates.
 *   2) Build request.
 *   3) Call backend.
 *   4) Draw route.
 *   5) Plan hybrid itinerary.
 *   6) Plot and display results.
 */
export function initRouteFetcher() {
  document.getElementById('getRoute').addEventListener('click', () => {
    const startCoords = getStartCoords();
    const endCoords = getEndCoords();
    const viaCoords = getViaCoords(); // possibly empty array

    if (!startCoords || !endCoords) {
      alert('Please select start and end locations.');
      return;
    }

    // Daily distance
    const dailyDistance = parseFloat(document.getElementById('dailyDistance').value);
    if (isNaN(dailyDistance) || dailyDistance <= 0) {
      alert('Please enter a valid daily biking distance.');
      return;
    }

    // Other route options
    const maxSpeed = parseFloat(document.getElementById('maxSpeed').value);
    const Tertiary = parseFloat(document.getElementById('Tertiary').value);
    const Secondary = parseFloat(document.getElementById('Secondary').value);
    const Primary = parseFloat(document.getElementById('Primary').value);
    const BikeNetwork = parseFloat(document.getElementById('BikeNetwork').value);
    const Surface = parseFloat(document.getElementById('Surface').value);

    const customModel = {
      priority: [
        { if: 'road_class == TERTIARY', multiply_by: Tertiary },
        { if: 'road_class == SECONDARY', multiply_by: Secondary },
        { if: 'road_class == PRIMARY', multiply_by: Primary },
        { if: 'bike_network == MISSING', multiply_by: BikeNetwork },
        { if: 'surface == GRAVEL', multiply_by: Surface }
      ]
    };

    const points = viaCoords && viaCoords.length > 0
      ? [startCoords, ...viaCoords, endCoords]
      : [startCoords, endCoords];

    // Build request body
    const requestBody = {
      points,
      max_speed: maxSpeed,
      custom_model: customModel
    };

    // Fetch route from backend
    fetch('/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert('Error: ' + data.error);
          return;
        }

        const route = data.paths[0]; // typical GH-like response
        drawRouteOnMap(route);

        // Now build the hybrid itinerary
        const dayPlan = planHybridItinerary(route, dailyDistance);

        // Plot markers on map
        plotHybridPlan(dayPlan);

        // Update side panel with the hybrid itinerary
        updateHybridSidebar(dayPlan);
      })
      .catch(err => {
        console.error(err);
        alert('Failed to fetch route. See console for details.');
      });
  });
}
