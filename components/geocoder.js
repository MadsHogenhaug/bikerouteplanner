'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import Geocoder from './MyGeocoderWrapper';
import { MapContext } from './map';
import { MAPBOX_TOKEN } from '@/lib/mapbox';
import { formatCoords } from '@/lib/formatters';

const START_ID = 'start';
const END_ID = 'end';
const MARKER_COLORS = { [START_ID]: 'green', [END_ID]: 'red', via: 'blue' };
const FLY_ZOOM = 14;

const GeocoderContext = createContext(null);

export const useGeocoders = () => {
  const ctx = useContext(GeocoderContext);
  if (!ctx) throw new Error('useGeocoders must be used within a GeocoderProvider');
  return ctx;
};

const makeViaId = () => `via-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const GeocoderProvider = ({ children }) => {
  const map = useContext(MapContext);

  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [viaPoints, setViaPoints] = useState([]);

  // Marker instances held in a ref keyed by id — avoids re-renders on marker churn.
  const markersRef = useRef(new Map());

  const setMarker = useCallback((id, coords, color) => {
    if (!map) return;
    const existing = markersRef.current.get(id);
    if (existing) existing.remove();
    if (!coords) {
      markersRef.current.delete(id);
      return;
    }
    const marker = new mapboxgl.Marker({ color }).setLngLat(coords).addTo(map);
    markersRef.current.set(id, marker);
  }, [map]);

  const flyTo = useCallback((coords) => {
    if (map && coords) map.flyTo({ center: coords, zoom: FLY_ZOOM });
  }, [map]);

  useEffect(() => () => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
  }, []);

  const handleEndpoint = useCallback((id, coords, placeName) => {
    const setCoords = id === START_ID ? setStartCoords : setEndCoords;
    const setInput = id === START_ID ? setStartInput : setEndInput;
    setCoords(coords);
    setInput(coords ? (placeName || formatCoords(coords)) : '');
    setMarker(id, coords, MARKER_COLORS[id]);
    if (coords) flyTo(coords);
  }, [setMarker, flyTo]);

  const onRetrieve = (id) => (feature) => {
    const coords = feature?.geometry?.coordinates;
    if (coords) handleEndpoint(id, coords, feature.place_name);
  };

  const onClear = (id) => () => handleEndpoint(id, null, '');

  const setDestinationPoint = useCallback((coords, placeName) => {
    handleEndpoint(END_ID, coords, placeName);
  }, [handleEndpoint]);

  const addViaPoint = useCallback(() => {
    setViaPoints((prev) => [...prev, { id: makeViaId(), coords: null, input: '' }]);
  }, []);

  const removeViaPoint = useCallback((id) => {
    setMarker(id, null);
    setViaPoints((prev) => prev.filter((p) => p.id !== id));
  }, [setMarker]);

  const updateViaPoint = useCallback((id, patch) => {
    setViaPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const handleViaRetrieve = useCallback((id, feature) => {
    const coords = feature?.geometry?.coordinates;
    const input = feature?.place_name || '';
    updateViaPoint(id, { coords, input });
    setMarker(id, coords, MARKER_COLORS.via);
    flyTo(coords);
  }, [updateViaPoint, setMarker, flyTo]);

  const handleViaClear = useCallback((id) => {
    updateViaPoint(id, { coords: null, input: '' });
    setMarker(id, null);
  }, [updateViaPoint, setMarker]);

  const setViaPoint = useCallback((coords, placeName) => {
    if (!coords) return;
    const id = makeViaId();
    const input = placeName || formatCoords(coords);
    setViaPoints((prev) => [...prev, { id, coords, input }]);
    setMarker(id, coords, MARKER_COLORS.via);
    flyTo(coords);
  }, [setMarker, flyTo]);

  const contextValue = {
    startCoords,
    endCoords,
    viaPoints,
    setDestinationPoint,
    addViaPoint,
    removeViaPoint,
    setViaPoint,
  };

  return (
    <GeocoderContext.Provider value={contextValue}>
      <div className="geocoder-wrapper" role="search" aria-label="Location search">
        <div className="geocoder-container geocoder-start">
          <Geocoder
            accessToken={MAPBOX_TOKEN}
            placeholder="Start location"
            onRetrieve={onRetrieve(START_ID)}
            onClear={onClear(START_ID)}
            map={map}
            mapboxgl={mapboxgl}
            marker={false}
            inputValue={startInput}
            onChange={setStartInput}
            aria-label="Search for start location"
          />
        </div>

        <div id="viaGeocodersContainer">
          {viaPoints.map((point, index) => (
            <div key={point.id} className="geocoder-container geocoder-via">
              <Geocoder
                accessToken={MAPBOX_TOKEN}
                placeholder={`Via point ${index + 1}`}
                onRetrieve={(feature) => handleViaRetrieve(point.id, feature)}
                onClear={() => handleViaClear(point.id)}
                map={map}
                mapboxgl={mapboxgl}
                marker={false}
                inputValue={point.input}
                onChange={(value) => updateViaPoint(point.id, { input: value })}
                aria-label={`Search for via point ${index + 1}`}
              />
              <button
                onClick={() => removeViaPoint(point.id)}
                className="remove-via-btn"
                aria-label={`Remove via point ${index + 1}`}
                title="Remove via point"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          id="addViaPoint"
          className="button-base button-secondary add-via-button"
          onClick={addViaPoint}
          type="button"
        >
          + Add Via Point
        </button>

        <div className="geocoder-container geocoder-end">
          <Geocoder
            accessToken={MAPBOX_TOKEN}
            placeholder="Destination"
            onRetrieve={onRetrieve(END_ID)}
            onClear={onClear(END_ID)}
            map={map}
            mapboxgl={mapboxgl}
            marker={false}
            inputValue={endInput}
            onChange={setEndInput}
            aria-label="Search for destination"
          />
        </div>
      </div>
      {children}
    </GeocoderContext.Provider>
  );
};
