// components/route-fetcher.jsx
'use client';

import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { MapContext } from './map';
import { useGeocoders } from './geocoder'; // Now provides viaPoints
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useItineraryPlanner } from '../hooks/useItineraryPlanner'; // Adjust path if needed

const RouteFetcher = () => {
  // --- Context & Hooks ---
  const map = useContext(MapContext);
  const { startCoords, endCoords, viaPoints } = useGeocoders(); // Get viaPoints from context
  const { planRouteItinerary, isPlanning: isItineraryPlanning, error: itineraryError } = useItineraryPlanner();

  // --- State ---
  const [routeData, setRouteData] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState('');
  // Route Options State
  const [primaryPref, setPrimaryPref] = useState('1.0');
  const [secondaryPref, setSecondaryPref] = useState('1.0');
  const [tertiaryPref, setTertiaryPref] = useState('1.0');
  const [bikeNetworkPref, setBikeNetworkPref] = useState('1.0');
  const [surfacePref, setSurfacePref] = useState('0.8'); // Gravel penalty
  const [maxSpeedPref, setMaxSpeedPref] = useState(''); // Max speed (optional)
  const [dailyDistancePref, setDailyDistancePref] = useState('100');

  // --- Refs ---
  const routeLayerAdded = useRef(false);
  const itineraryMarkersRef = useRef([]);

  // --- UI Toggles ---
  const toggleOptions = () => setIsOptionsOpen((prev) => !prev);

  // --- Functions to Clear Map Elements ---
  const clearRouteDisplay = useCallback(() => { /* ... same as previous ... */
    if (map && map.isStyleLoaded() && routeLayerAdded.current) {
      try {
        if (map.getLayer('route')) map.removeLayer('route');
        if (map.getSource('route')) map.removeSource('route');
      } catch (e) { console.warn("Minor error clearing route layer/source:", e); }
    }
    routeLayerAdded.current = false;
    setRouteData(null);
  }, [map]);

  const clearItineraryMarkers = useCallback(() => { /* ... same as previous ... */
    if (itineraryMarkersRef.current.length > 0) {
      console.log(`Removing ${itineraryMarkersRef.current.length} itinerary markers`);
      try { itineraryMarkersRef.current.forEach(marker => marker.remove()); }
      catch(e) { console.warn("Minor error during marker removal:", e); }
      itineraryMarkersRef.current = [];
    }
  }, []);

  const clearItineraryDisplay = useCallback(() => { /* ... same as previous ... */
    clearItineraryMarkers();
    setItinerary(null);
  }, [clearItineraryMarkers]);

  // --- Draw Route on Map ---
  const drawRouteOnMap = useCallback((currentRouteData) => { /* ... same as previous ... */
     if (!map || !currentRouteData?.points?.coordinates) return;
    if (!map.isStyleLoaded()) { map.once('load', () => drawRouteOnMap(currentRouteData)); return; }
    if (routeLayerAdded.current) {
        if (map.getLayer('route')) map.removeLayer('route');
        if (map.getSource('route')) map.removeSource('route');
        routeLayerAdded.current = false;
    }
    try {
      map.addSource('route', { type: 'geojson', data: currentRouteData.points });
      map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#1DB954', 'line-width': 8, 'line-opacity': 0.8 }});
      routeLayerAdded.current = true;
      const coordinates = currentRouteData.points.coordinates;
      if (coordinates.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        map.fitBounds(bounds, { padding: { top: 100, bottom: 50, left: 350, right: 50 }, maxZoom: 15 });
      }
    } catch (mapError) { console.error("Error drawing route:", mapError); setRouteError("Failed to display route."); routeLayerAdded.current = false; }
  }, [map]);

  // --- Handle Get Route Button Click ---
  const handleGetRoute = async () => {
    setRouteError('');
    clearRouteDisplay();
    clearItineraryDisplay();

    // Validation
    if (!startCoords || !endCoords) { setRouteError('Please select start and end locations.'); return; }
    const validViaCoords = viaPoints.map(p => p.coords).filter(Boolean);
    if (validViaCoords.length !== viaPoints.length) { setRouteError('Select locations for all via points or remove unused ones.'); return; }
    const dailyDistNum = parseFloat(dailyDistancePref);
    if (isNaN(dailyDistNum) || dailyDistNum <= 0) { setRouteError('Enter a valid daily distance.'); return; }

    setIsLoadingRoute(true);

    // Construct points array including valid via points
    const pointsForApi = [startCoords, ...validViaCoords, endCoords].filter(p => p && Array.isArray(p) && p.length === 2);
    if (pointsForApi.length < 2) { setRouteError('Valid start and end points required.'); setIsLoadingRoute(false); return; }

    // Construct Custom Model
    const customModel = {
      priority: [
        { if: 'road_class == PRIMARY', multiply_by: primaryPref },
        { if: 'road_class == SECONDARY', multiply_by: secondaryPref },
        { if: 'road_class == TERTIARY', multiply_by: tertiaryPref },
        { if: 'bike_network == MISSING', multiply_by: bikeNetworkPref },
        ...(surfacePref && !isNaN(parseFloat(surfacePref)) ? [{ if: 'surface == GRAVEL', multiply_by: surfacePref }] : [])
      ],
       // Note: GraphHopper speed parameter structure might vary. Check docs.
       // speed: [ ...(maxSpeedPref && !isNaN(parseFloat(maxSpeedPref)) ? [{ if: `true`, limit_to: `${maxSpeedPref} km/h`}] : []) ]
    };

    // Construct Request Body
    const requestBody = {
      points: pointsForApi,
      custom_model: customModel,
      calc_points: true,
      profile: 'bike',
      instructions: false,
      points_encoded: false,
      'ch.disable': true, // Important if using custom_model without CH support
       // Include max_speed detail if GraphHopper supports it this way & value is valid
       // ...(maxSpeedPref && !isNaN(parseFloat(maxSpeedPref)) && { details: ["max_speed"], max_speed: parseFloat(maxSpeedPref) })
    };

    console.log("API Request Body:", JSON.stringify(requestBody, null, 2));

    try {
      // 1. Fetch Route
      const response = await fetch('/api/routing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || `HTTP error! status: ${response.status}`);
      if (!data.paths || data.paths.length === 0) throw new Error('No route found.');
      const fetchedRouteData = data.paths[0];
      setRouteData(fetchedRouteData);
      drawRouteOnMap(fetchedRouteData);
      setIsLoadingRoute(false); // Route fetched

      // 2. Plan Itinerary
      const itineraryWeights = { distanceDeviationWeight: 5, offRouteDeviationWeight: 0.02 };
      const calculatedItinerary = await planRouteItinerary(fetchedRouteData, dailyDistNum, itineraryWeights);
      if (calculatedItinerary) setItinerary(calculatedItinerary);
      else console.warn("Itinerary planning failed or returned no results.");

    } catch (error) {
      console.error('Error during process:', error);
      setRouteError(`Operation failed: ${error.message}`);
      clearRouteDisplay(); clearItineraryDisplay(); setIsLoadingRoute(false);
    }
  };

  // --- Effect to Plot Itinerary Markers ---
  useEffect(() => { /* ... same as previous ... */
      if (!map || !itinerary || itinerary.length === 0) { clearItineraryMarkers(); return; }
      console.log(`Plotting ${itinerary.length} markers.`); const markers = [];
      itinerary.forEach((stop, i) => {
        let color; if (stop.type === 'start') color = 'black'; else if (stop.type === 'destination') color = 'red'; else if (stop.type === 'Hotel') color = 'blue'; else color = 'green';
        const cumulativeKm = (stop.routeDistance / 1000).toFixed(1); let deltaKm = 0; if (i > 0) deltaKm = (stop.routeDistance - itinerary[i - 1].routeDistance) / 1000;
        const title = (stop.type === 'start' || stop.type === 'destination') ? stop.type.charAt(0).toUpperCase() + stop.type.slice(1) : stop.name;
        const popupHTML = `<div style="font-family: 'Inter', sans-serif; font-size: 0.9em; max-width: 220px;"><strong style="font-size: 1.1em;">${title}</strong><br/>Dist: ${cumulativeKm} km<br/>${ i === 0 ? '' : `(+${deltaKm.toFixed(1)} km)<br/>` }${ (stop.type !== 'start' && stop.type !== 'destination') ? `Detour: ${stop.offRoute.toFixed(0)} m` : '' }</div>`;
        try { const marker = new mapboxgl.Marker({ color }).setLngLat(stop.coords).setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(popupHTML)).addTo(map); markers.push(marker); } catch (markerError) { console.error("Error adding marker:", markerError, stop); }
      });
      itineraryMarkersRef.current = markers; console.log(`Finished plotting ${markers.length} markers.`);
      return () => { console.log("Cleanup: Removing markers."); markers.forEach(marker => { try { marker.remove(); } catch (e) {} }); };
  }, [map, itinerary, clearItineraryMarkers]);

  // --- Render Component ---
  return (
    <div className="route-fetcher">
      <button id="getRoute" className="button-base button-primary" onClick={handleGetRoute} disabled={isLoadingRoute || isItineraryPlanning}>
        {isLoadingRoute ? 'Fetching Route...' : (isItineraryPlanning ? 'Planning Itinerary...' : 'Get Route & Plan Itinerary')}
      </button>
      {routeError && <div className="route-error-message">Route Error: {routeError}</div>}
      {itineraryError && <div className="route-error-message">Itinerary Error: {itineraryError}</div>}

      {/* --- Route Options --- */}
      <div className="route-options-toggle" onClick={toggleOptions} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? toggleOptions() : null} aria-expanded={isOptionsOpen} aria-controls="route-options-content">
        <h3>Route Options</h3>
        <span className={`route-options-arrow ${isOptionsOpen ? 'open' : ''}`} aria-hidden="true">▾</span>
      </div>
      <div id="route-options-content" className={`route-options-content ${isOptionsOpen ? 'open' : ''}`}>
        <div>
            <p>Road Type Preferences (0.0 - 2.0)</p>
            <label> Primary Roads <input type="number" id="Primary" step="0.1" min="0" max="2" value={primaryPref} onChange={(e) => setPrimaryPref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Primary roads preference"/> </label>
            <label> Secondary Roads <input type="number" id="Secondary" step="0.1" min="0" max="2" value={secondaryPref} onChange={(e) => setSecondaryPref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Secondary roads preference"/> </label>
            <label> Tertiary Roads <input type="number" id="Tertiary" step="0.1" min="0" max="2" value={tertiaryPref} onChange={(e) => setTertiaryPref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Tertiary roads preference"/> </label>
            <label> Non-Bike Network Penalty <input type="number" id="BikeNetwork" step="0.1" min="0" max="2" value={bikeNetworkPref} onChange={(e) => setBikeNetworkPref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Non-bike network roads penalty preference"/> </label>
            <label> Gravel Surface Penalty (0.0 - 1.0) <input type="number" id="Surface" step="0.1" min="0" max="1" value={surfacePref} onChange={(e) => setSurfacePref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Gravel surface penalty preference"/> </label>
            <hr style={{margin: "15px 0"}}/>
            {/* <label> Max Speed (km/h - optional) <input type="number" id="maxSpeed" min="5" max="100" value={maxSpeedPref} onChange={(e) => setMaxSpeedPref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} placeholder="e.g., 25" aria-label="Maximum riding speed"/> </label> */}
            <label> Target Daily Distance (km) <input type="number" id="dailyDistance" min="1" max="500" value={dailyDistancePref} onChange={(e) => setDailyDistancePref(e.target.value)} disabled={isLoadingRoute || isItineraryPlanning} aria-label="Target daily distance"/> </label>
        </div>
      </div>
      {/* --- End Route Options --- */}

      {/* --- Itinerary Display Section --- */}
      {itinerary && itinerary.length > 0 && (
        <div className="itinerary-display">
          <h3>Planned Itinerary</h3>
          <ul>
            {itinerary.map((stop, index) => {
                const cumulativeKm = (stop.routeDistance / 1000).toFixed(1); let deltaKm = 0; if (index > 0) deltaKm = (stop.routeDistance - itinerary[index - 1].routeDistance) / 1000;
                const title = (stop.type === 'start' || stop.type === 'destination') ? stop.type.charAt(0).toUpperCase() + stop.type.slice(1) : stop.name;
                return (
                  <li key={`${stop.type}-${index}-${stop.name}`} className="itinerary-stop">
                    <strong>{index === 0 ? title : `Day ${index}: ${title}`}</strong><br />
                    <span className="itinerary-details">
                      {cumulativeKm} km total {index > 0 && ` (+${deltaKm.toFixed(1)} km)`} {(stop.type !== 'start' && stop.type !== 'destination') && `, ~${stop.offRoute.toFixed(0)}m detour`}
                    </span>
                  </li>);
            })}
          </ul>
        </div>
      )}
      {/* --- End Itinerary Display --- */}
    </div> // End route-fetcher div
  );
};

export default RouteFetcher;