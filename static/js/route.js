// route.js – Fetch a route from the backend and draw it on the map

import { getMap } from './map.js';
import { getStartCoords, getEndCoords } from './geocoder.js';

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
  
  document.getElementById('getRoute').addEventListener('click', function() {
    const startCoords = getStartCoords();
    const endCoords = getEndCoords();
    if (!startCoords || !endCoords) {
      alert("Please select both start and end locations.");
      return;
    }
    
    // Retrieve dynamic routing parameters from the UI
    const maxSpeed = parseFloat(document.getElementById('maxSpeed').value);
    const Tertiary = document.getElementById('Tertiary').value;
    const Secondary = document.getElementById('Secondary').value;
    const Primary = document.getElementById('Primary').value;
    const BikeNetwork = document.getElementById('BikeNetwork').value;
    const Surface = document.getElementById('Surface').value;
    
    console.log("Max Speed: ", maxSpeed);
    console.log("Tertiary: ", Tertiary);
    console.log("Secondary: ", Secondary);
    console.log("Primary: ", Primary);
    console.log("Bike Network: ", BikeNetwork);
    console.log("Surface: ", Surface);
    
    // Build custom routing model based on user input
    const customModel = {
      priority: [
        {"if": "road_class == TERTIARY", "multiply_by": Tertiary},
        {"if": "road_class == SECONDARY", "multiply_by": Secondary},
        {"if": "road_class == PRIMARY", "multiply_by": Primary},
        {"if": "bike_network == MISSING", "multiply_by": BikeNetwork},
        {"if": "surface == GRAVEL", "multiply_by": Surface}
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
    .then(response => {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.json();
    })
    .then(data => {
      if (data.error) {
        alert("Error: " + data.error);
        return;
      }
      const routes = data.paths;
      if (!routes || routes.length === 0) {
        alert("No routes found.");
        return;
      }
      const route = routes[0];
      drawRouteOnMap(route);
      
      // Calculate midpoint and display distance
      const distanceInKm = (route.distance / 1000).toFixed(2);
      const midIndex = Math.floor(route.points.coordinates.length / 2);
      const midCoord = route.points.coordinates[midIndex];
      
      if (window.popUp) {
        window.popUp.remove();
      }
      
      window.popUp = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(midCoord)
        .setHTML(`
          <div style="
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            font-family: 'Arial', sans-serif;
            font-size: 14px;
            font-weight: bold;
            color: #333;
            text-align: center;
          ">
            📏 Distance: <span style="color: #007AFF;">${distanceInKm} km</span>
          </div>
        `)
        .addTo(map);
    })
    .catch(error => {
      console.error("Error fetching route:", error);
      alert("Failed to fetch route. See console for details.");
    });
  });
}
