// components/geocoder.jsx
'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import Geocoder from './MyGeocoderWrapper';
import mapboxgl from 'mapbox-gl';
import { MapContext } from './map';

// --- Environment Variable Setup ---
if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    console.warn("Mapbox Access Token not found. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.");
}
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'YOUR_FALLBACK_TOKEN_IF_NEEDED';

// --- Context Definition ---
export const GeocoderContext = createContext(null);

// --- Provider Component ---
export const GeocoderProvider = ({ children }) => {
  const map = useContext(MapContext);

  // --- State ---
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startMarker, setStartMarker] = useState(null); // Holds mapboxgl.Marker instance
  const [endMarker, setEndMarker] = useState(null);   // Holds mapboxgl.Marker instance
  // Update Via Points State Structure
  const [viaPoints, setViaPoints] = useState([]); // Now: { id, coords, input, marker }

  // --- Marker Handling Function (Generalized) ---
  // This helper now just creates/removes a single marker instance
  const manageMarkerInstance = useCallback((coords, color, existingMarkerInstance) => {
    if (!map) return null;
    try {
      // Remove previous marker if it exists
      if (existingMarkerInstance) {
          existingMarkerInstance.remove();
      }
      // Create new marker if coords are provided
      if (coords) {
        const newMarker = new mapboxgl.Marker({ color })
          .setLngLat(coords)
          .addTo(map);
        return newMarker; // Return the new instance
      }
    } catch (error) {
      console.error("Error managing marker instance:", error);
    }
    return null; // Return null if no marker created or on error
  }, [map]);

  // --- Start Point Handlers ---
  const handleStartRetrieve = useCallback((feature) => {
    const coords = feature?.geometry?.coordinates;
    if (coords) {
        setStartCoords(coords);
        setStartInput(feature.place_name || '');
        const newMarker = manageMarkerInstance(coords, 'green', startMarker); // Create/update
        setStartMarker(newMarker); // Store new instance in state
        if (map && newMarker) map.flyTo({ center: coords, zoom: 14 });
    }
  }, [map, startMarker, manageMarkerInstance]);

  const handleStartClear = useCallback(() => {
    setStartCoords(null);
    setStartInput('');
    manageMarkerInstance(null, '', startMarker); // Remove marker
    setStartMarker(null); // Clear state
  }, [startMarker, manageMarkerInstance]);

  // --- End Point Handlers ---
  const setDestinationPoint = useCallback((coords, placeName) => {
    if (!map || !coords) return;
    setEndCoords(coords);
    setEndInput(placeName || `Lng: ${coords[0].toFixed(5)}, Lat: ${coords[1].toFixed(5)}`);
    const newMarker = manageMarkerInstance(coords, 'red', endMarker); // Create/update
    setEndMarker(newMarker); // Store new instance in state
    if (newMarker) map.flyTo({ center: coords, zoom: 14 });
  }, [map, endMarker, manageMarkerInstance]);

  const handleEndRetrieve = useCallback((feature) => {
     const coords = feature?.geometry?.coordinates;
     const placeName = feature?.place_name;
     if (coords) setDestinationPoint(coords, placeName);
  }, [setDestinationPoint]);

  const handleEndClear = useCallback(() => {
    setEndCoords(null);
    setEndInput('');
    manageMarkerInstance(null, '', endMarker); // Remove marker
    setEndMarker(null); // Clear state
  }, [endMarker, manageMarkerInstance]);


  // --- Via Point Handlers (Updated for Markers) ---
  const addViaPoint = useCallback(() => {
    setViaPoints(prev => [
      ...prev,
      // Initialize marker as null
      { id: Date.now() + Math.random(), coords: null, input: '', marker: null }
    ]);
  }, []);

  const removeViaPoint = useCallback((idToRemove) => {
    // Find the point being removed to access its marker *before* filtering state
    const pointToRemove = viaPoints.find(point => point.id === idToRemove);
    if (pointToRemove?.marker) {
        manageMarkerInstance(null, '', pointToRemove.marker); // Remove marker from map
    }
    // Now filter the state array
    setViaPoints(prev => prev.filter(point => point.id !== idToRemove));
  }, [viaPoints, manageMarkerInstance]); // Depend on viaPoints to find the marker

  // Updates a specific via point when its geocoder gets a result
  const handleViaRetrieve = useCallback((idToUpdate, feature) => {
    const coords = feature?.geometry?.coordinates;
    const placeName = feature?.place_name || '';

    setViaPoints(prev => prev.map(point => {
      if (point.id === idToUpdate) {
        // Manage marker for this specific via point
        const newMarker = manageMarkerInstance(coords, 'blue', point.marker); // Use blue for via points
        return { ...point, coords: coords, input: placeName, marker: newMarker }; // Update state with new marker instance
      }
      return point; // Return other points unchanged
    }));

    if (map && coords) map.flyTo({ center: coords, zoom: 14 });
  }, [map, manageMarkerInstance]);

  // Clears a specific via point's data and marker
  const handleViaClear = useCallback((idToUpdate) => {
    setViaPoints(prev => prev.map(point => {
      if (point.id === idToUpdate) {
        // Remove the marker associated with this point
        manageMarkerInstance(null, '', point.marker);
        // Return cleared point state
        return { ...point, coords: null, input: '', marker: null };
      }
      return point;
    }));
  }, [manageMarkerInstance]);

  // Handles controlled input change (no marker changes needed here)
  const handleViaInputChange = useCallback((idToUpdate, value) => {
      setViaPoints(prev => prev.map(point =>
          point.id === idToUpdate ? { ...point, input: value } : point
      ));
  }, []);

  // Function to set a via point from POI popup - Adds a *new* via point with marker
  const setViaPointFromPopup = useCallback((coords, placeName) => {
    const newId = Date.now() + Math.random();
    // Create the marker first
    const newMarker = manageMarkerInstance(coords, 'blue', null); // No existing marker to remove

    if (newMarker) { // Only add to state if marker creation was successful
        const newPoint = {
            id: newId,
            coords: coords,
            input: placeName || `Lng: ${coords[0].toFixed(5)}, Lat: ${coords[1].toFixed(5)}`,
            marker: newMarker // Store the marker instance
        };
        setViaPoints(prev => [...prev, newPoint]);
        if (map) map.flyTo({ center: coords, zoom: 14 });
    }
  }, [map, manageMarkerInstance]);


  // --- Context Value ---
  const contextValue = {
    startCoords,
    endCoords,
    viaPoints, // Array now includes marker instances: { id, coords, input, marker }
    setDestinationPoint,
    addViaPoint,
    removeViaPoint,
    setViaPoint: setViaPointFromPopup,
  };

  // --- Render Provider ---
  return (
    <GeocoderContext.Provider value={contextValue}>
      {/* Wrapper for all geocoders */}
      <div className="geocoder-wrapper" role="search" aria-label="Location search">

        {/* Start Geocoder */}
        <div className="geocoder-container geocoder-start" role="combobox" aria-expanded="false">
          {/* ... Start Geocoder JSX ... */}
           <Geocoder
            accessToken={mapboxgl.accessToken} placeholder="Start location"
            onRetrieve={handleStartRetrieve} onClear={handleStartClear}
            map={map} mapboxgl={mapboxgl} marker={false}
            inputValue={startInput} onChange={(value) => setStartInput(value)}
            aria-label="Search for start location"
          />
        </div>

        {/* Dynamically Rendered Via Geocoders */}
        <div id="viaGeocodersContainer">
            {viaPoints.map((point, index) => (
                <div key={point.id} className="geocoder-container geocoder-via">
                    {/* ... Via Geocoder JSX ... */}
                     <Geocoder
                        accessToken={mapboxgl.accessToken}
                        placeholder={`Via point ${index + 1}`}
                        onRetrieve={(feature) => handleViaRetrieve(point.id, feature)}
                        onClear={() => handleViaClear(point.id)}
                        map={map} mapboxgl={mapboxgl} marker={false}
                        inputValue={point.input}
                        onChange={(value) => handleViaInputChange(point.id, value)}
                        aria-label={`Search for via point ${index + 1}`}
                    />
                    {/* ... Remove Button JSX ... */}
                     <button
                        onClick={() => removeViaPoint(point.id)}
                        className="remove-via-btn"
                        aria-label={`Remove via point ${index + 1}`}
                        title="Remove via point"
                        type="button"
                    > × </button>
                </div>
            ))}
        </div>

        {/* Add Via Point Button */}
        {/* ... Add Via Point Button JSX ... */}
         <button
            id="addViaPoint"
            className="button-base button-secondary add-via-button"
            onClick={addViaPoint}
            type="button"
        > + Add Via Point </button>

        {/* End Geocoder */}
        <div className="geocoder-container geocoder-end" role="combobox" aria-expanded="false">
          {/* ... End Geocoder JSX ... */}
           <Geocoder
            accessToken={mapboxgl.accessToken} placeholder="Destination"
            onRetrieve={handleEndRetrieve} onClear={handleEndClear}
            map={map} mapboxgl={mapboxgl} marker={false}
            inputValue={endInput} onChange={(value) => setEndInput(value)}
            aria-label="Search for destination"
          />
        </div>

      </div>
      {children}
    </GeocoderContext.Provider>
  );
};

// Custom hook remains the same
export const useGeocoders = () => {
  const context = useContext(GeocoderContext);
  if (!context) throw new Error('useGeocoders must be used within a GeocoderProvider');
  return context;
};