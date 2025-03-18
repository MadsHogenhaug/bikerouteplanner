// map.js
// -----------------------------
// React component for Mapbox map with context
'use client'

import React, { createContext, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

export const MapContext = createContext(null);

const Map = ({ children }) => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    mapboxgl.accessToken = "pk.eyJ1IjoibWFkc2hvZ2VuaGF1ZyIsImEiOiJjbTg3dmxwMWMwYTVtMmxyMHdvMnpzeHh4In0.WST60JiV0RZV9Ne8CRdPpw";
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [12.5700724, 55.6867243],
      zoom: 10
    });
    mapInstance.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    setMap(mapInstance);
    
    // Expose the map instance globally if needed.
    window.mapboxMapInstance = mapInstance;

    return () => mapInstance.remove();
  }, []);

  return (
    <MapContext.Provider value={map}>
      <div id="map" ref={mapContainerRef} style={{ width: '100%', height: '100vh' }} />
      {children}
    </MapContext.Provider>
  );
};

export default Map;
