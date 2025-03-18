// geocoder.jsx
'use client';

import React, { createContext, useState, useContext } from 'react';
import { Geocoder } from '@mapbox/search-js-react';
import mapboxgl from 'mapbox-gl';
import { MapContext } from './map';
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken =
  'pk.eyJ1IjoibWFkc2hvZ2VuaGF1ZyIsImEiOiJjbTg3dmxwMWMwYTVtMmxyMHdvMnpzeHh4In0.WST60JiV0RZV9Ne8CRdPpw';

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

  console.log(startCoords, endCoords);
  

  return (
    <GeocoderContext.Provider value={{ startCoords, endCoords }}>
      <div 
        className="geocoder-wrapper" 
        style={{ border: 'none', padding: '0' }}
        role="search"
        aria-label="Location search"
      >
        <div className="geocoder-container" role="combobox" aria-expanded="false">
          <Geocoder
            accessToken={mapboxgl.accessToken}
            placeholder="Start location"
            onRetrieve={handleStartRetrieve}
            map={map}
            mapboxgl={mapboxgl}
            marker={false}
            aria-label="Search for start location"
          />
        </div>

        <div className="geocoder-container" role="combobox" aria-expanded="false">
          <Geocoder
            accessToken={mapboxgl.accessToken}
            placeholder="Destination"
            onRetrieve={handleEndRetrieve}
            map={map}
            mapboxgl={mapboxgl}
            marker={false}
            aria-label="Search for destination"
          />
        </div>
      </div>
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

