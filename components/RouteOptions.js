'use client';

import React from 'react';

const ROAD_FIELDS = [
  { key: 'primary', label: 'Primary Roads', min: 0, max: 2, step: 0.1 },
  { key: 'secondary', label: 'Secondary Roads', min: 0, max: 2, step: 0.1 },
  { key: 'tertiary', label: 'Tertiary Roads', min: 0, max: 2, step: 0.1 },
  { key: 'bikeNetwork', label: 'Non-Bike Network Penalty', min: 0, max: 2, step: 0.1 },
  { key: 'surface', label: 'Gravel Surface Penalty (0.0 - 1.0)', min: 0, max: 1, step: 0.1 },
];

const NumberField = ({ label, value, onChange, disabled, min, max, step }) => (
  <label>
    {label}
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={label}
    />
  </label>
);

const RouteOptions = ({ isOpen, onToggle, prefs, setPref, disabled }) => (
  <>
    <div
      className="route-options-toggle"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggle();
      }}
      aria-expanded={isOpen}
      aria-controls="route-options-content"
    >
      <h3>Route Options</h3>
      <span className={`route-options-arrow ${isOpen ? 'open' : ''}`} aria-hidden="true">▾</span>
    </div>
    <div id="route-options-content" className={`route-options-content ${isOpen ? 'open' : ''}`}>
      <p>Road Type Preferences (0.0 - 2.0)</p>
      {ROAD_FIELDS.map((field) => (
        <NumberField
          key={field.key}
          label={field.label}
          value={prefs[field.key]}
          onChange={(value) => setPref(field.key, value)}
          disabled={disabled}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      ))}
      <hr style={{ margin: '15px 0' }} />
      <NumberField
        label="Target Daily Distance (km)"
        value={prefs.dailyDistance}
        onChange={(value) => setPref('dailyDistance', value)}
        disabled={disabled}
        min={1}
        max={500}
        step={1}
      />
    </div>
  </>
);

export default RouteOptions;
