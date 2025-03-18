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
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
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
    const primaryVal = document.getElementById('Primary')?.value || '1.0';
    const secondaryVal = document.getElementById('Secondary')?.value || '1.0';
    const tertiaryVal = document.getElementById('Tertiary')?.value || '1.0';
    const bikeNetVal = document.getElementById('BikeNetwork')?.value || '0.5';
    const dailyDistance = document.getElementById('dailyDistance')?.value || '100';

    const customModel = {
      priority: [
        { if: 'road_class == PRIMARY', multiply_by: primaryVal },
        { if: 'road_class == SECONDARY', multiply_by: secondaryVal },
        { if: 'road_class == TERTIARY', multiply_by: tertiaryVal },
        { if: 'bike_network == MISSING', multiply_by: bikeNetVal }
      ],
    };

    const requestBody = {
      points: [startCoords, endCoords],
      custom_model: customModel,
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

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    margin: '4px 0 12px 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    transition: 'border-color 0.3s ease',
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
  };

  return (
    <div className="route-fetcher" style={{ padding: '16px' }}>
      <button
        id="getRoute"
        onClick={handleGetRoute}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#1DB954',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.3s ease',
          marginBottom: '20px'
        }}
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
          justifyContent: 'space-between',
          padding: '12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          marginBottom: '8px'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>Route Options</h3>
        <span
          style={{
            fontSize: '1.5rem',
            transition: 'transform 0.3s ease',
            transform: isOptionsOpen ? 'rotate(0deg)' : 'rotate(-90deg)'
          }}
        >
          &#9662;
        </span>
      </div>

      {/* Options content */}
      <div 
        style={{ 
          maxHeight: isOptionsOpen ? '1000px' : '0',
          opacity: isOptionsOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out',
          padding: '0 12px'
        }}
      >
        <div style={{ marginTop: '16px' }}>
          <p style={{ ...labelStyle, marginBottom: '12px' }}>Road Type Preferences (0.0 - 2.0)</p>
          
          <label style={labelStyle}>
            Primary Roads
            <input 
              type="number" 
              id="Primary" 
              defaultValue="1.0" 
              style={inputStyle}
              step="0.1"
              min="0"
              max="2"
            />
          </label>

          <label style={labelStyle}>
            Secondary Roads
            <input 
              type="number" 
              id="Secondary" 
              defaultValue="1.0" 
              style={inputStyle}
              step="0.1"
              min="0"
              max="2"
            />
          </label>

          <label style={labelStyle}>
            Tertiary Roads
            <input 
              type="number" 
              id="Tertiary" 
              defaultValue="1.0" 
              style={inputStyle}
              step="0.1"
              min="0"
              max="2"
            />
          </label>

          <label style={labelStyle}>
            Non-Bike Network Roads
            <input 
              type="number" 
              id="BikeNetwork" 
              defaultValue="1.0" 
              style={inputStyle}
              step="0.1"
              min="0"
              max="2"
            />
          </label>

          <label style={labelStyle}>
            Daily Distance (km)
            <input 
              type="number" 
              id="dailyDistance" 
              defaultValue="100" 
              style={inputStyle}
              min="1"
              max="500"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default RouteFetcher;

