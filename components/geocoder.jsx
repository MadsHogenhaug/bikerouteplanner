'use client';

import React, { createContext, useState, useContext } from 'react';

import Geocoder from './MyGeocoderWrapper'; // the dynamic import file

import mapboxgl from 'mapbox-gl';
import { MapContext } from './map';

mapboxgl.accessToken =
  'pk.eyJ1IjoibWFkc2hvZ2VuaGF1ZyIsImEiOiJjbTg3dmxwMWMwYTVtMmxyMHdvMnpzeHh4In0.WST60JiV0RZV9Ne8CRdPpw';

export const GeocoderContext = createContext(null);

export const GeocoderProvider = ({ children }) => {
  const map = useContext(MapContext);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);

  // Called when user selects a start location
  const handleStartRetrieve = (feature) => {
    if (!map) return;
    const coords = feature?.geometry?.coordinates;
    if (coords) {
      setStartCoords(coords);
      // Remove any existing start marker
      if (startMarker) {
        startMarker.remove();
      }
      const marker = new mapboxgl.Marker({ color: "green" })
        .setLngLat(coords)
        .addTo(map);
      setStartMarker(marker);
      setStartInput(feature.place_name || '');
      map.flyTo({ center: coords, zoom: 14 });
    }
  };

  // Called when the start field is cleared
  const handleStartClear = () => {
    if (startMarker) {
      startMarker.remove();
      setStartMarker(null);
    }
    setStartCoords(null);
    setStartInput('');
  };

  // Called when user selects a destination location
  const handleEndRetrieve = (feature) => {
    if (!map) return;
    const coords = feature?.geometry?.coordinates;
    if (coords) {
      setEndCoords(coords);
      if (endMarker) {
        endMarker.remove();
      }
      const marker = new mapboxgl.Marker({ color: "red" })
        .setLngLat(coords)
        .addTo(map);
      setEndMarker(marker);
      setEndInput(feature.place_name || '');
      map.flyTo({ center: coords, zoom: 14 });
    }
  };

  // Called when the destination field is cleared
  const handleEndClear = () => {
    if (endMarker) {
      endMarker.remove();
      setEndMarker(null);
    }
    setEndCoords(null);
    setEndInput('');
  };

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
            onClear={handleStartClear}
            map={map}
            mapboxgl={mapboxgl}
            marker={false}
            inputValue={startInput}
            onChange={(value) => setStartInput(value)}
            aria-label="Search for start location"
          />
        </div>

        <div className="geocoder-container" role="combobox" aria-expanded="false">
          <Geocoder
            accessToken={mapboxgl.accessToken}
            placeholder="Destination"
            onRetrieve={handleEndRetrieve}
            onClear={handleEndClear}
            map={map}
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

export const useGeocoders = () => {
  const context = useContext(GeocoderContext);
  if (!context) {
    throw new Error('useGeocoders must be used within a GeocoderProvider');
  }
  return context;
};
