// components/route-fetcher.jsx
'use client';

import React, { useContext, useState, useEffect } from 'react';
import { MapContext } from './map';
import { useGeocoders } from './geocoder';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const RouteFetcher = () => {
  const map = useContext(MapContext);
  const { startCoords, endCoords } = useGeocoders();
  const [routeData, setRouteData] = useState(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [primaryPref, setPrimaryPref] = useState('1.0');
  const [secondaryPref, setSecondaryPref] = useState('1.0');
  const [tertiaryPref, setTertiaryPref] = useState('1.0');
  const [bikeNetworkPref, setBikeNetworkPref] = useState('1.0');
  const [dailyDistancePref, setDailyDistancePref] = useState('100');

  const toggleOptions = () => setIsOptionsOpen((prev) => !prev);

    const drawRouteOnMap = (route) => {
    if (!map) return;

    if (!map.isStyleLoaded()) {
        console.warn("Map style not loaded yet, delaying route drawing.");
        map.once('load', () => drawRouteOnMap(route));
        return;
    }

    try {
        if (map.getSource('route')) {
          if (map.getLayer('route')) {
            map.removeLayer('route');
          }
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
            'line-opacity': 0.8
          },
        });

        if (route.points && route.points.coordinates && route.points.coordinates.length > 0) {
            const coordinates = route.points.coordinates;
             const bounds = new mapboxgl.LngLatBounds();
             coordinates.forEach(coord => {
                bounds.extend(coord);
            });

            // TO DO: Consider adjusting padding based on sidebar state if needed
            map.fitBounds(bounds, {
                padding: { top: 100, bottom: 50, left: 350, right: 50 },
                maxZoom: 15
             });
        } else {
             console.warn("Route data received, but coordinates are missing or empty.");
        }

    } catch (mapError) {
        console.error("Error drawing route on map:", mapError);
        setError("Failed to display the route on the map.");
    }
  };


  const handleGetRoute = async () => {
    setError('');
    setRouteData(null);

    if (!startCoords || !endCoords) {
      setError('Please select start and end locations first.');
      return;
    }

    setIsLoading(true);

    const customModel = {
      priority: [
        { if: 'road_class == PRIMARY', multiply_by: primaryPref },
        { if: 'road_class == SECONDARY', multiply_by: secondaryPref },
        { if: 'road_class == TERTIARY', multiply_by: tertiaryPref },
        { if: 'bike_network == MISSING', multiply_by: bikeNetworkPref }
      ],
    };

    const requestBody = {
      points: [startCoords, endCoords],
      custom_model: customModel,
      daily_distance: parseFloat(dailyDistancePref) || 100
    };

    try {
      const response = await fetch('/api/routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(`Error fetching route: ${data.error || response.statusText || 'Unknown error'}`);
        setIsLoading(false);
        return;
      }

      if (!data.paths || data.paths.length === 0) {
        setError('No route found between the selected locations with the given options.');
        setIsLoading(false);
        return;
      }

      const route = data.paths[0];
      setRouteData(route);
      drawRouteOnMap(route);

    } catch (error) {
      console.error('Error fetching route:', error);
      setError('Failed to fetch route. Check the browser console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // No more inline style objects needed here (inputStyle, labelStyle, errorStyle)

  return (
    // Apply class from modules.css - padding is handled by the class now
    <div className="route-fetcher">
      <button
        id="getRoute" // Keep ID if needed elsewhere, otherwise remove
        // Apply classes from components.css
        className="button-base button-primary"
        onClick={handleGetRoute}
        disabled={isLoading}
      >
        {isLoading ? 'Calculating...' : 'Get Route'}
      </button>

      {/* Display Error Messages using class from modules.css */}
      {error && (
        <div className="route-error-message">
          {error}
        </div>
      )}

      {/* --- Collapsible Route Options --- */}
      <div
        // Apply class from modules.css
        className="route-options-toggle"
        onClick={toggleOptions}
        aria-expanded={isOptionsOpen}
        aria-controls="route-options-content"
        role="button" // Make it a button for accessibility
        tabIndex={0} // Make focusable
        onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? toggleOptions() : null} // Keyboard toggle
      >
        {/* H3 - Styling handled by .route-options-toggle h3 in modules.css */}
        <h3>Route Options</h3>
        <span
           // Apply classes from modules.css, including conditional 'open' class
          className={`route-options-arrow ${isOptionsOpen ? 'open' : ''}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </div>

      {/* --- Options Content --- */}
      <div
        id="route-options-content" // Keep ID for aria-controls
        // Apply classes from modules.css, including conditional 'open' class
        className={`route-options-content ${isOptionsOpen ? 'open' : ''}`}
      >
        {/* Inner div helps with padding transitions if needed, but content can be direct children */}
        <div>
          {/* P tag - Styling handled by .route-options-content p */}
          <p>Road Type Preferences (0.0 - 2.0)</p>

          {/* Label - Styling handled by .route-options-content label */}
          <label>
            Primary Roads
            {/* Input - Styling handled by .route-options-content input[type="number"] */}
            <input
              type="number"
              id="Primary" // Keep ID for label association
              step="0.1" min="0" max="2"
              value={primaryPref}
              onChange={(e) => setPrimaryPref(e.target.value)}
              disabled={isLoading}
              aria-label="Primary roads preference" // Add aria-label
            />
          </label>

          {/* Repeat for other labels/inputs */}
          <label>
            Secondary Roads
            <input
              type="number"
              id="Secondary"
              step="0.1" min="0" max="2"
              value={secondaryPref}
              onChange={(e) => setSecondaryPref(e.target.value)}
              disabled={isLoading}
               aria-label="Secondary roads preference"
            />
          </label>

          <label>
            Tertiary Roads
            <input
              type="number"
              id="Tertiary"
              step="0.1" min="0" max="2"
              value={tertiaryPref}
              onChange={(e) => setTertiaryPref(e.target.value)}
              disabled={isLoading}
               aria-label="Tertiary roads preference"
            />
          </label>

          <label>
            Non-Bike Network Roads Penalty
            <input
              type="number"
              id="BikeNetwork"
              step="0.1" min="0" max="2"
              value={bikeNetworkPref}
              onChange={(e) => setBikeNetworkPref(e.target.value)}
              disabled={isLoading}
               aria-label="Non-bike network roads penalty preference"
            />
          </label>

          <label>
            Target Daily Distance (km)
            <input
              type="number"
              id="dailyDistance"
              min="1" max="500"
              value={dailyDistancePref}
              onChange={(e) => setDailyDistancePref(e.target.value)}
              disabled={isLoading}
              aria-label="Target daily distance in kilometers"
            />
          </label>
        </div>
      </div>
      {/* --- End Route Options --- */}

    </div>
  );
};

export default RouteFetcher;