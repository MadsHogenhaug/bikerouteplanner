// components/geocoder.jsx
'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import Geocoder from './MyGeocoderWrapper';
import mapboxgl from 'mapbox-gl';
import { MapContext } from './map';

// Ensure you have this in your .env.local file!
// NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token_here
if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    console.warn("Mapbox Access Token not found. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.");
}
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

export const GeocoderContext = createContext(null);

export const GeocoderProvider = ({ children }) => {
  const map = useContext(MapContext); // Get map instance from context
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);

  // Use map instance directly from context where possible, ensures it's the latest
  // No need for localMapInstance state unless dealing with specific timing issues

  // --- Function to set the destination point (used by Geocoder and POI popups) ---
  const setDestinationPoint = useCallback((coords, placeName) => {
      if (!map || !coords) return; // Use map directly from context

       try {
          setEndCoords(coords); // Update state
          // Manage marker
          if (endMarker) endMarker.remove();
          const marker = new mapboxgl.Marker({ color: "red" })
          .setLngLat(coords)
          .addTo(map);
          setEndMarker(marker); // Store new marker
          // Update input field
          setEndInput(placeName || `Lng: ${coords[0].toFixed(5)}, Lat: ${coords[1].toFixed(5)}`);
          // Move map view
          map.flyTo({ center: coords, zoom: 14 });
      } catch (error) {
           console.error("Error setting destination point:", error);
      }
  }, [map, endMarker]); // Depend on map instance and endMarker state


  // --- Geocoder Handlers ---
  const handleStartRetrieve = useCallback((feature) => {
    if (!map) return; // Check map from context
    const coords = feature?.geometry?.coordinates;
    if (coords) {
      try {
        setStartCoords(coords);
        if (startMarker) startMarker.remove();
        const marker = new mapboxgl.Marker({ color: "green" })
          .setLngLat(coords)
          .addTo(map);
        setStartMarker(marker);
        setStartInput(feature.place_name || '');
        map.flyTo({ center: coords, zoom: 14 });
      } catch (error) {
          console.error("Error adding start marker or flying to location:", error);
      }
    }
  }, [map, startMarker]); // Depend on map and startMarker

  const handleStartClear = useCallback(() => {
    try {
        if (startMarker) {
          startMarker.remove();
          setStartMarker(null);
        }
    } catch (error) {
         console.error("Error removing start marker:", error);
    }
    setStartCoords(null);
    setStartInput('');
  }, [startMarker]); // Depend on startMarker

  // Geocoder destination selection uses the shared function
  const handleEndRetrieve = useCallback((feature) => {
     const coords = feature?.geometry?.coordinates;
     const placeName = feature?.place_name;
     if (coords) {
         setDestinationPoint(coords, placeName);
     }
  }, [setDestinationPoint]); // Depend on the setDestinationPoint function

  const handleEndClear = useCallback(() => {
     try {
        if (endMarker) {
          endMarker.remove();
          setEndMarker(null);
        }
     } catch (error) {
          console.error("Error removing end marker:", error);
     }
    setEndCoords(null);
    setEndInput('');
  }, [endMarker]); // Depend on endMarker


  // --- Prepare Context Value ---
  const contextValue = {
    startCoords,
    endCoords,
    setDestinationPoint, // Expose the function for POI layers
  };

  // --- Render Provider ---
  return (
    <GeocoderContext.Provider value={contextValue}>
      {/* Use class from components.css */}
      <div
        className="geocoder-wrapper"
        role="search"
        aria-label="Location search"
      >
        {/* Geocoder needs map instance to potentially interact with viewport etc. */}
        {/* Passing map (from context) ensures it uses the loaded instance */}
        <div className="geocoder-container" role="combobox" aria-expanded="false">
          <Geocoder
            accessToken={mapboxgl.accessToken}
            placeholder="Start location"
            onRetrieve={handleStartRetrieve}
            onClear={handleStartClear}
            map={map} // Pass map instance from context
            mapboxgl={mapboxgl}
            marker={false} // Manual marker handling
            inputValue={startInput}
            onChange={(value) => setStartInput(value)} // Allow parent control if needed
            aria-label="Search for start location"
          />
        </div>

        <div className="geocoder-container" role="combobox" aria-expanded="false">
          <Geocoder
            accessToken={mapboxgl.accessToken}
            placeholder="Destination"
            onRetrieve={handleEndRetrieve}
            onClear={handleEndClear}
            map={map} // Pass map instance from context
            mapboxgl={mapboxgl}
            marker={false}
            inputValue={endInput}
            onChange={(value) => setEndInput(value)}
            aria-label="Search for destination"
          />
        </div>
      </div>
      {children}
    </GeocoderContext.Provider>
  );
};

// Custom hook to consume the context
export const useGeocoders = () => {
  const context = useContext(GeocoderContext);
  if (!context) {
    throw new Error('useGeocoders must be used within a GeocoderProvider');
  }
  return context;
};