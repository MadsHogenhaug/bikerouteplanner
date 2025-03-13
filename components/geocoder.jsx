// geocoder.jsx
'use client';

import React, { createContext, useState, useContext } from 'react';
import { Geocoder } from '@mapbox/search-js-react';
import mapboxgl from 'mapbox-gl';
import { MapContext } from './map';
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken =
  'pk.eyJ1IjoibWFkc2hvZ2VuaGF1ZyIsImEiOiJjbTZ0eDZxdGQwNmhyMmlxcHFqbWI2ZmNnIn0.hTjKwQBm6SptIfln2J5FSA';

export const GeocoderContext = createContext(null);

export const GeocoderProvider = ({ children }) => {
  const map = useContext(MapContext);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  // Called when user selects a start location
  const handleStartRetrieve = (feature) => {
    if (!map) return;
    const coords = feature?.geometry?.coordinates;
    if (coords) {
      setStartCoords(coords);
      new mapboxgl.Marker({ color: "green" })
        .setLngLat(coords)
        .addTo(map);
      map.flyTo({ center: coords, zoom: 14 });
    }
  };

  // Called when user selects a destination location
  const handleEndRetrieve = (feature) => {
    if (!map) return;
    const coords = feature?.geometry?.coordinates;
    if (coords) {
      setEndCoords(coords);
      new mapboxgl.Marker({ color: "red" })
        .setLngLat(coords)
        .addTo(map);
      map.flyTo({ center: coords, zoom: 14 });
    }
  };

  return (
    <GeocoderContext.Provider value={{ startCoords, endCoords }}>
      <div className="geocoder-wrapper" style={{ border: 'none', padding: '0' }}>
        {/* Remove labels and just use placeholders */}
        <Geocoder
          accessToken={mapboxgl.accessToken}
          placeholder="Start location"
          onRetrieve={handleStartRetrieve}
          map={map}
          mapboxgl={mapboxgl}
          marker={false}
        />

        {/* No “+Add Stop” button—ignore it */}

        <Geocoder
          accessToken={mapboxgl.accessToken}
          placeholder="Destination"
          onRetrieve={handleEndRetrieve}
          map={map}
          mapboxgl={mapboxgl}
          marker={false}
        />
      </div>

      {/* Remove "Log Start & End Locations" button */}
      {children}
    </GeocoderContext.Provider>
  );
};

export const useGeocoders = () => {
  const context = useContext(GeocoderContext);
  if (!context) {
    throw new Error('useGeocoders must be used within a GeocoderProvider');
  }
  return context;
};

