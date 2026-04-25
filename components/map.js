'use client';

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@/lib/mapbox';

export const MapContext = createContext(null);
export const MapStyleContext = createContext(null);

const INITIAL_STYLE = 'mapbox://styles/mapbox/streets-v12';
const INITIAL_CENTER = [12.5700724, 55.6867243];
const INITIAL_ZOOM = 10;

const Map = ({ children }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(INITIAL_STYLE);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: INITIAL_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.on('load', () => {
      mapRef.current = map;
      setIsLoaded(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, []);

  const setMapStyle = useCallback((newStyle) => {
    if (mapRef.current && newStyle !== currentStyle) {
      mapRef.current.setStyle(newStyle);
      setCurrentStyle(newStyle);
    }
  }, [currentStyle]);

  return (
    <MapContext.Provider value={isLoaded ? mapRef.current : null}>
      <MapStyleContext.Provider value={{ currentStyle, setMapStyle }}>
        <div id="map" ref={containerRef} />
        {children}
      </MapStyleContext.Provider>
    </MapContext.Provider>
  );
};

export default Map;
