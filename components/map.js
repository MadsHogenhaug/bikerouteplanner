// components/map.jsx
'use client';

import React, { createContext, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'; // Ensure CSS is imported

export const MapContext = createContext(null);

const Map = ({ children }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null); // Use ref to hold the map instance
  const [isMapLoaded, setIsMapLoaded] = useState(false); // Track load status

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return; // Prevent re-initialization

    // Use environment variable for token
    // Ensure you have this in your .env.local file!
    // NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token_here
    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
        console.warn("Mapbox Access Token not found. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.");
    }
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [12.5700724, 55.6867243],
      zoom: 10,
      attributionControl: true // Keep attribution control visible
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    mapInstance.on('load', () => {
      mapRef.current = mapInstance;
      setIsMapLoaded(true);
      console.log('Map loaded and context updated');
    });

    //  mapInstance.on('error', (e) => {
    //     console.error('Mapbox error:', e.error?.message || e);
    //  });

    // Clean up on component unmount
    return () => {
      console.log('Removing map');
      // Check if map instance exists before removing
      if (mapInstance) {
        mapInstance.remove();
      }
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    // Provide the map instance via context ONLY when it's loaded
    <MapContext.Provider value={isMapLoaded ? mapRef.current : null}>
      {/* Apply ID for styling hook from layout.css */}
      <div id="map" ref={mapContainerRef} />
      {/* Render children regardless of map load status; children should handle null map */}
      {children}
    </MapContext.Provider>
  );
};

export default Map;