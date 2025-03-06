// route.js
// =============================
// Contains the map display of the route itself
// and triggers the itinerary planning and rendering from itinerary.js
// =============================

import { loadSleepingLocations } from './nearbySleep.js';
import { getMap } from './map.js';
import { getStartCoords, getEndCoords, getViaCoords } from './geocoder.js';
import {
  planItinerary,
  plotItineraryMarkers,
  updateItinerarySidebar,
} from './itinerary.js';

// Make sure lodging data is loaded
loadSleepingLocations();

export function drawRouteOnMap(route) {
  const map = getMap();

  // Remove any existing route layer/source first
  if (map.getSource('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }

  map.addSource('route', {
    type: 'geojson',
    data: route.points,
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
      'line-width': 8,
    },
  });

  const coordinates = route.points.coordinates;
  const bounds = coordinates.reduce(
    (b, coord) => b.extend(coord),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
  );
  map.fitBounds(bounds, { padding: 20 });
}

export function initRouteFetcher() {
  const map = getMap();

  document.getElementById('getRoute').addEventListener('click', function () {
    const startCoords = getStartCoords();
    const endCoords = getEndCoords();
    const viaCoords = getViaCoords();

    if (!startCoords || !endCoords || !viaCoords) {
      alert('Please select start, end, and via locations.');
      return;
    }

    const dailyDistance = parseFloat(
      document.getElementById('dailyDistance').value
    );
    if (isNaN(dailyDistance) || dailyDistance <= 0) {
      alert('Please enter a valid daily biking distance.');
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
        { if: 'road_class == TERTIARY', multiply_by: Tertiary },
        { if: 'road_class == SECONDARY', multiply_by: Secondary },
        { if: 'road_class == PRIMARY', multiply_by: Primary },
        { if: 'bike_network == MISSING', multiply_by: BikeNetwork },
        { if: 'surface == GRAVEL', multiply_by: Surface }
        // { if: 'road_environment == FERRY', multiply_by: .5 }
      ],
    };

    // If multiple via-points, spread them
    const requestBody = {
      points:
        viaCoords.length > 2
          ? [startCoords, ...viaCoords, endCoords]
          : [startCoords, viaCoords, endCoords],
      max_speed: maxSpeed,
      custom_model: customModel,
    };

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

        // The result from the backend, e.g. data.paths[0]
        const route = data.paths[0];

        // Show route on map
        drawRouteOnMap(route);

        // Compute itinerary
        const itinerary = planItinerary(route, dailyDistance);

        // Display stops (markers, sidebar listing)
        plotItineraryMarkers(itinerary);
        updateItinerarySidebar(itinerary);
      })
      .catch(error => {
        console.error('Error fetching route:', error);
        alert('Failed to fetch route. Check console for details.');
      });
  });
}
