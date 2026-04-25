'use client';

import React from 'react';

const normaliseUrl = (url) => (url.startsWith('http') ? url : `//${url}`);

const PoiPopup = ({ name, website, onSetDestination, onSetVia }) => (
  <div className="poi-popup">
    <div className="poi-popup-header">
      <strong>{name}</strong>
      <br />
      {website ? (
        <a href={normaliseUrl(website)} target="_blank" rel="noopener noreferrer">
          {website}
        </a>
      ) : (
        <span className="poi-popup-no-website">No website available</span>
      )}
    </div>
    <button
      type="button"
      className="mapboxgl-popup-button poi-set-destination-button"
      onClick={onSetDestination}
    >
      Set as Destination
    </button>
    <button
      type="button"
      className="mapboxgl-popup-button poi-set-via-button"
      onClick={onSetVia}
    >
      Set as Via Point
    </button>
  </div>
);

export default PoiPopup;
