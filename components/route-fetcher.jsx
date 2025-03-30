// components/route-fetcher.jsx
'use client';

import React, { useContext, useState, useEffect, useRef, useCallback } from 'react'; // Added useRef, useCallback
import { MapContext } from './map';
import { useGeocoders } from './geocoder';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useItineraryPlanner } from '../hooks/useItineraryPlanner'; // Adjust path if needed

const RouteFetcher = () => {
  // --- Context & Hooks ---
  const map = useContext(MapContext);
  const { startCoords, endCoords } = useGeocoders();
  const { planRouteItinerary, isPlanning: isItineraryPlanning, error: itineraryError } = useItineraryPlanner();

  // --- State ---
  // Route Data
  const [routeData, setRouteData] = useState(null);
  // Itinerary Data
  const [itinerary, setItinerary] = useState(null);
  // UI State
  const [isOptionsOpen, setIsOptionsOpen] = useState(false); // Keep state for options toggle
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState('');
  // Route Options State
  const [primaryPref, setPrimaryPref] = useState('1.0');
  const [secondaryPref, setSecondaryPref] = useState('1.0');
  const [tertiaryPref, setTertiaryPref] = useState('1.0');
  const [bikeNetworkPref, setBikeNetworkPref] = useState('1.0');
  const [dailyDistancePref, setDailyDistancePref] = useState('100');

  // --- Refs ---
  const routeLayerAdded = useRef(false); // Track if route layer exists
  const itineraryMarkersRef = useRef([]); // Store itinerary mapbox marker instances

  // --- UI Toggles ---
  const toggleOptions = () => setIsOptionsOpen((prev) => !prev);

  // --- Functions to Clear Map Elements ---

  // Clear only the route line and reset related state/ref
  const clearRouteDisplay = useCallback(() => {
    if (map && map.isStyleLoaded() && routeLayerAdded.current) {
      try {
        if (map.getLayer('route')) map.removeLayer('route');
        if (map.getSource('route')) map.removeSource('route');
      } catch (e) {
        console.warn("Minor error clearing route layer/source:", e);
      }
    }
    routeLayerAdded.current = false; // Reset ref
    setRouteData(null); // Clear route data state
  }, [map]); // Depends on map instance

  // Clear only the itinerary markers and reset the ref
  const clearItineraryMarkers = useCallback(() => {
    if (itineraryMarkersRef.current.length > 0) {
      console.log(`Removing ${itineraryMarkersRef.current.length} itinerary markers`);
      try {
        itineraryMarkersRef.current.forEach(marker => marker.remove());
      } catch (e) {
        console.warn("Minor error during marker removal:", e);
      }
      itineraryMarkersRef.current = []; // Clear the ref array AFTER removing
    }
  }, []); // No external dependencies

  // Clear itinerary state and call marker clearing function
  const clearItineraryDisplay = useCallback(() => {
    clearItineraryMarkers();
    setItinerary(null);
  }, [clearItineraryMarkers]); // Depends on marker clearing function


  // --- Draw Route on Map ---
  const drawRouteOnMap = useCallback((currentRouteData) => {
    if (!map || !currentRouteData?.points?.coordinates) return;

    if (!map.isStyleLoaded()) {
      map.once('load', () => drawRouteOnMap(currentRouteData));
      return;
    }

    // Ensure previous route is cleared (might be redundant if called elsewhere, but safe)
    if (routeLayerAdded.current) {
        if (map.getLayer('route')) map.removeLayer('route');
        if (map.getSource('route')) map.removeSource('route');
        routeLayerAdded.current = false;
    }

    try {
      map.addSource('route', { type: 'geojson', data: currentRouteData.points });
      map.addLayer({
        id: 'route', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#1DB954', 'line-width': 8, 'line-opacity': 0.8 },
      });
      routeLayerAdded.current = true; // Mark layer as added

      // Fit map bounds
      const coordinates = currentRouteData.points.coordinates;
      if (coordinates.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        map.fitBounds(bounds, {
          padding: { top: 100, bottom: 50, left: 350, right: 50 }, // Adjust for sidebar
          maxZoom: 15
        });
      }
    } catch (mapError) {
      console.error("Error drawing route on map:", mapError);
      setRouteError("Failed to display the route on the map.");
      routeLayerAdded.current = false; // Ensure flag is false on error
    }
  }, [map]); // Depends on map instance

  // --- Handle Get Route Button Click ---
  const handleGetRoute = async () => {
    setRouteError(''); // Clear previous errors
    clearRouteDisplay(); // Clear previous route line
    clearItineraryDisplay(); // Clear previous itinerary markers and data

    if (!startCoords || !endCoords) {
      setRouteError('Please select start and end locations first.');
      return;
    }
    const dailyDistNum = parseFloat(dailyDistancePref);
    if (isNaN(dailyDistNum) || dailyDistNum <= 0) {
      setRouteError('Please enter a valid positive daily biking distance.');
      return;
    }

    setIsLoadingRoute(true); // Start loading indicator

    const customModel = { /* ... your custom model settings ... */
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
    };

    try {
      // 1. Fetch Route Geometry
      const response = await fetch('/api/routing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      if (!response.ok || data.error) throw new Error(data.error || `HTTP error! status: ${response.status}`);
      if (!data.paths || data.paths.length === 0) throw new Error('No route found.');

      const fetchedRouteData = data.paths[0];
      setRouteData(fetchedRouteData); // Store route data
      drawRouteOnMap(fetchedRouteData); // Draw route line

      setIsLoadingRoute(false); // Route fetched, stop route loading indicator

      // 2. Plan Itinerary (asynchronously)
      const itineraryWeights = { distanceDeviationWeight: 5, offRouteDeviationWeight: 0.02 };
      const calculatedItinerary = await planRouteItinerary(fetchedRouteData, dailyDistNum, itineraryWeights);

      if (calculatedItinerary) {
        setItinerary(calculatedItinerary); // Update itinerary state, triggering marker plotting useEffect
      } else {
        // Itinerary planning failed or returned null (error state is handled by the hook)
        console.warn("Itinerary planning failed or returned no results.");
      }

    } catch (error) {
      console.error('Error during process:', error);
      setRouteError(`Operation failed: ${error.message}`);
      // Ensure cleanup even if fetch/planning fails midway
      clearRouteDisplay();
      clearItineraryDisplay();
      setIsLoadingRoute(false); // Stop loading indicator on error
    }
    // No finally block needed for loading state as it's handled per step/error
  };

  // --- Effect to Plot Itinerary Markers ---
  useEffect(() => {
    if (!map || !itinerary || itinerary.length === 0) {
      clearItineraryMarkers(); // Ensure markers are cleared if itinerary is removed/empty
      return;
    }

    console.log(`Plotting ${itinerary.length} itinerary markers.`);
    const markers = []; // Local array for markers created in this run

    itinerary.forEach((stop, i) => {
      let color;
      if (stop.type === 'start') color = 'black';
      else if (stop.type === 'destination') color = 'red';
      else if (stop.type === 'Hotel') color = 'blue';
      else color = 'green';

      const cumulativeKm = (stop.routeDistance / 1000).toFixed(1);
      let deltaKm = 0;
      if (i > 0) deltaKm = (stop.routeDistance - itinerary[i - 1].routeDistance) / 1000;
      const title = (stop.type === 'start' || stop.type === 'destination') ? stop.type.charAt(0).toUpperCase() + stop.type.slice(1) : stop.name;
      const popupHTML = `
        <div style="font-family: 'Inter', sans-serif; font-size: 0.9em; max-width: 220px;">
          <strong style="font-size: 1.1em;">${title}</strong><br/>
          Dist: ${cumulativeKm} km<br/>
          ${ i === 0 ? '' : `(+${deltaKm.toFixed(1)} km)<br/>` }
          ${ (stop.type !== 'start' && stop.type !== 'destination') ? `Detour: ${stop.offRoute.toFixed(0)} m` : '' }
        </div>
      `;

      try {
        const marker = new mapboxgl.Marker({ color })
          .setLngLat(stop.coords)
          .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(popupHTML))
          .addTo(map);
        markers.push(marker);
      } catch (markerError) {
        console.error("Error adding itinerary marker:", markerError, stop);
      }
    });

    // Successfully added markers, update the ref
    itineraryMarkersRef.current = markers;
    console.log(`Finished plotting ${markers.length} markers.`);

    // Cleanup function for this effect instance
    return () => {
      console.log("Effect Cleanup: Removing markers from this effect run.");
      markers.forEach(marker => {
        try { marker.remove(); } catch (e) { /* ignore */ }
      });
    };
  }, [map, itinerary, clearItineraryMarkers]); // Dependencies: map, itinerary data, and the marker clearer

  // --- Render Component ---
  return (
    <div className="route-fetcher">
      <button
        id="getRoute"
        className="button-base button-primary"
        onClick={handleGetRoute}
        disabled={isLoadingRoute || isItineraryPlanning}
      >
        {isLoadingRoute ? 'Fetching Route...' : (isItineraryPlanning ? 'Planning Itinerary...' : 'Get Route & Plan Itinerary')}
      </button>

      {/* Display Errors */}
      {routeError && <div className="route-error-message">Route Error: {routeError}</div>}
      {itineraryError && <div className="route-error-message">Itinerary Error: {itineraryError}</div>}

      {/* --- Collapsible Route Options (Restored Structure) --- */}
      <div
        className="route-options-toggle"
        onClick={toggleOptions}
        aria-expanded={isOptionsOpen}
        aria-controls="route-options-content"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? toggleOptions() : null}
      >
        <h3>Route Options</h3>
        <span className={`route-options-arrow ${isOptionsOpen ? 'open' : ''}`} aria-hidden="true">▾</span>
      </div>

      {/* --- Options Content (Restored Structure) --- */}
      <div
        id="route-options-content"
        className={`route-options-content ${isOptionsOpen ? 'open' : ''}`}
      >
        <div> {/* Inner wrapper */}
            <p>Road Type Preferences (0.0 - 2.0)</p>
            <label> Primary Roads <input type="number" id="Primary" step="0.1" min="0" max="2" value={primaryPref} onChange={(e) => setPrimaryPref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Primary roads preference"/> </label>
            <label> Secondary Roads <input type="number" id="Secondary" step="0.1" min="0" max="2" value={secondaryPref} onChange={(e) => setSecondaryPref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Secondary roads preference"/> </label>
            <label> Tertiary Roads <input type="number" id="Tertiary" step="0.1" min="0" max="2" value={tertiaryPref} onChange={(e) => setTertiaryPref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Tertiary roads preference"/> </label>
            <label> Non-Bike Network Penalty <input type="number" id="BikeNetwork" step="0.1" min="0" max="2" value={bikeNetworkPref} onChange={(e) => setBikeNetworkPref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Non-bike network roads penalty preference"/> </label>
            <hr style={{margin: "15px 0"}}/>
            <label> Target Daily Distance (km) <input type="number" id="dailyDistance" min="1" max="500" value={dailyDistancePref} onChange={(e) => setDailyDistancePref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Target daily distance in kilometers"/> </label>
        </div>
      </div>
      {/* --- End Route Options --- */}


       {/* --- Itinerary Display Section --- */}
        {itinerary && itinerary.length > 0 && (
            <div className="itinerary-display">
                <h3>Planned Itinerary</h3>
                <ul>
                    {itinerary.map((stop, index) => {
                         const cumulativeKm = (stop.routeDistance / 1000).toFixed(1);
                         let deltaKm = 0;
                         if (index > 0) deltaKm = (stop.routeDistance - itinerary[index - 1].routeDistance) / 1000;
                         const title = (stop.type === 'start' || stop.type === 'destination') ? stop.type.charAt(0).toUpperCase() + stop.type.slice(1) : stop.name;
                         return (
                            <li key={`${stop.type}-${index}-${stop.name}`} className="itinerary-stop">
                                <strong>{index === 0 ? title : `Day ${index}: ${title}`}</strong><br />
                                <span className="itinerary-details">
                                    {cumulativeKm} km total
                                    {index > 0 && ` (+${deltaKm.toFixed(1)} km)`}
                                    {(stop.type !== 'start' && stop.type !== 'destination') && `, ~${stop.offRoute.toFixed(0)}m detour`}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        )}
        {/* --- End Itinerary Display --- */}
    </div> // End route-fetcher div
  );
};

export default RouteFetcher;