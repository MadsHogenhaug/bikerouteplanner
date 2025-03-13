// route.jsx
'use client';

import React, { useContext, useState } from 'react';
import { MapContext } from './map';
import { useGeocoders } from './geocoder';
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";

const RouteFetcher = () => {
  const map = useContext(MapContext);
  const { startCoords, endCoords } = useGeocoders();
  const [routeData, setRouteData] = useState(null);

  // Controls collapsing of "Route Options"
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);
  const toggleOptions = () => setIsOptionsOpen((prev) => !prev);

  const drawRouteOnMap = (route) => {
    if (!map) return;
    // Remove existing route layer/source if any
    if (map.getSource('route')) {
      if (map.getLayer('route')) map.removeLayer('route');
      map.removeSource('route');
    }
    // Add new route layer
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
    // Fit bounds around route
    const coordinates = route.points.coordinates;
    const bounds = coordinates.reduce(
      (b, coord) => b.extend(coord),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
    );
    map.fitBounds(bounds, { padding: 20 });
  };

  const handleGetRoute = async () => {
    if (!startCoords || !endCoords) {
      alert('Please select start and end locations first.');
      return;
    }
    // Gather user inputs
    const gravelVal = document.getElementById('Gravel')?.value || '1.0';
    const maxSpeed = parseFloat(document.getElementById('maxSpeed')?.value || '25');
    const primaryVal = document.getElementById('Primary')?.value || '1.0';
    const secondaryVal = document.getElementById('Secondary')?.value || '1.0';
    const tertiaryVal = document.getElementById('Tertiary')?.value || '1.0';
    const bikeNetVal = document.getElementById('BikeNetwork')?.value || '0.5';
    const dailyDistance = document.getElementById('dailyDistance')?.value || '100';

    const customModel = {
      priority: [
        { if: 'surface == GRAVEL', multiply_by: gravelVal },
        { if: 'road_class == PRIMARY', multiply_by: primaryVal },
        { if: 'road_class == SECONDARY', multiply_by: secondaryVal },
        { if: 'road_class == TERTIARY', multiply_by: tertiaryVal },
        { if: 'bike_network == MISSING', multiply_by: bikeNetVal }
        // dailyDistance is not used in the priority, but you could add it if needed
      ],
    };

    const requestBody = {
      points: [startCoords, endCoords],
      max_speed: maxSpeed,
      custom_model: customModel,
      // You could send dailyDistance to your server if it’s relevant
      daily_distance: parseFloat(dailyDistance)
    };

    try {
      const response = await fetch('/api/routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (data.error) {
        alert('Error: ' + data.error);
        return;
      }
      const route = data.paths[0];
      setRouteData(route);
      drawRouteOnMap(route);
    } catch (error) {
      console.error('Error fetching route:', error);
      alert('Failed to fetch route. Check console for details.');
    }
  };

  return (
    <div className="route-fetcher">
      <button
        id="getRoute"
        onClick={handleGetRoute}
        style={{ marginTop: '1rem' }}
      >
        Get Route
      </button>
      {/* Collapsible "Route Options" header */}
      <div
        onClick={toggleOptions}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          marginTop: '1rem'
        }}
      >
        <h3 style={{ margin: 0, marginRight: '0.5rem' }}>Route Options</h3>
        <span
          style={{
            fontSize: '3rem',
            transition: 'transform 0.5s',
            transform: isOptionsOpen ? 'rotate(0deg)' : 'rotate(-90deg)'
          }}
        >
          &#9662;
        </span>
      </div>

      {/* Options content visible only if isOptionsOpen */}
      {isOptionsOpen && (
        <div style={{ marginTop: '1rem' }}>
          <div>
            <label>
              Gravel (0.0 - 1.0):
              <input type="text" id="Gravel" defaultValue="1.0" />
            </label>
          </div>
          <div>
            <label>
              Max Speed:
              <input type="number" id="maxSpeed" defaultValue="25" />
            </label>
          </div>
          <div>
            <label>
              (Primary):<br />
              <input type="text" id="Primary" defaultValue="1.0" />
              
            </label>
          </div>
          <div>
            <label>
              (Secondary):
              <input type="text" id="Secondary" defaultValue="1.0" />
            </label>
          </div>
          <div>
            <label>
              (Tertiary):<br />
              <input type="text" id="Tertiary" defaultValue="1.0" />
            </label>
          </div>
          <div>
            <label>
              (Bike Network Missing):
              <input type="float" id="BikeNetwork" defaultValue="1.0" />
            </label>
          </div>
          <div>
            <label>
              Daily Distance (km):
              <input type="number" id="dailyDistance" defaultValue="100" />
            </label>
          </div>


        </div>
      )}
    </div>
  );
};

export default RouteFetcher;

