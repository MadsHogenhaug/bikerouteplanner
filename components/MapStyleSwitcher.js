'use client';

import React, { useContext, useState } from 'react';
import { MapStyleContext } from './map';

const MAP_STYLES = [
  { id: 'mapbox://styles/mapbox/streets-v12', label: 'Streets', icon: '🗺' },
  { id: 'mapbox://styles/mapbox/outdoors-v12', label: 'Outdoors', icon: '🏔' },
  { id: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite', icon: '🛰' },
  { id: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Satellite Streets', icon: '🛰' },
  { id: 'mapbox://styles/mapbox/light-v11', label: 'Light', icon: '☀' },
  { id: 'mapbox://styles/mapbox/dark-v11', label: 'Dark', icon: '🌙' },
];

const MapStyleSwitcher = () => {
  const { currentStyle, setMapStyle } = useContext(MapStyleContext);
  const [isOpen, setIsOpen] = useState(false);

  const active = MAP_STYLES.find((s) => s.id === currentStyle) ?? MAP_STYLES[0];

  const select = (styleId) => {
    setMapStyle(styleId);
    setIsOpen(false);
  };

  return (
    <div className="map-style-switcher">
      <button
        className="map-style-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Change map style"
        aria-expanded={isOpen}
        type="button"
      >
        <span className="map-style-icon">{active.icon}</span>
        <span className="map-style-label">{active.label}</span>
        <span className="map-style-arrow">{isOpen ? '▴' : '▾'}</span>
      </button>
      {isOpen && (
        <ul className="map-style-menu" role="menu">
          {MAP_STYLES.map((style) => (
            <li key={style.id} role="none">
              <button
                role="menuitem"
                className={`map-style-option ${style.id === currentStyle ? 'active' : ''}`}
                onClick={() => select(style.id)}
                type="button"
              >
                <span>{style.icon}</span>
                <span>{style.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MapStyleSwitcher;
