// components/PoiLayers.jsx
'use client';

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapContext } from './map'; // Correct path assuming map.jsx is in components
import { useGeocoders } from './geocoder'; // Correct path assuming geocoder.jsx is in components

// --- Constants for Layer/Source IDs and URLs ---
const HOTELS_SOURCE_ID = 'hotels-source';
const HOTELS_CLUSTER_LAYER_ID = 'hotels-clusters';
const HOTELS_CLUSTER_COUNT_LAYER_ID = 'hotels-cluster-count';
const HOTELS_UNCLUSTERED_LAYER_ID = 'hotels-unclustered-point';
const HOTELS_URL = 'https://geojson-data-bikerouteplanner.s3.eu-north-1.amazonaws.com/denmark_hotels.geojson';

const SHELTERS_SOURCE_ID = 'shelters-source';
const SHELTERS_CLUSTER_LAYER_ID = 'shelters-clusters';
const SHELTERS_CLUSTER_COUNT_LAYER_ID = 'shelters-cluster-count';
const SHELTERS_UNCLUSTERED_LAYER_ID = 'shelters-unclustered-point';
const SHELTERS_URL = 'https://geojson-data-bikerouteplanner.s3.eu-north-1.amazonaws.com/denmark_shelters.geojson';
// --- End Constants ---

const PoiLayers = () => {
  const map = useContext(MapContext); // Get map instance from context
  // Get BOTH setDestinationPoint and setViaPoint from context
  const { setDestinationPoint, setViaPoint } = useGeocoders();

  const [hotelsVisible, setHotelsVisible] = useState(false);
  const [sheltersVisible, setSheltersVisible] = useState(false);

  // Ref to store the currently active popup to close it if another is opened
  const activePopup = useRef(null);

  // --- Helper Function to Add Layers ---
  const addPoiLayer = useCallback((mapInstance, idPrefix, sourceId, dataUrl, clusterLayerId, countLayerId, pointLayerId, clusterPaint, pointPaint) => {
    if (!mapInstance || mapInstance.getSource(sourceId)) return;
    try {
        mapInstance.addSource(sourceId, { type: 'geojson', data: dataUrl, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });
        mapInstance.addLayer({ id: clusterLayerId, type: 'circle', source: sourceId, filter: ['has', 'point_count'], paint: clusterPaint });
        mapInstance.addLayer({ id: countLayerId, type: 'symbol', source: sourceId, filter: ['has', 'point_count'], layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 12, 'text-allow-overlap': true }, paint: { 'text-color': '#ffffff' } });
        mapInstance.addLayer({ id: pointLayerId, type: 'circle', source: sourceId, filter: ['!', ['has', 'point_count']], paint: pointPaint });
    } catch (error) { console.error(`Error adding source/layer for ${idPrefix}:`, error); }
  }, []);

  // --- Helper Function to Remove Layers ---
  const removePoiLayer = useCallback((mapInstance, sourceId, clusterLayerId, countLayerId, pointLayerId) => {
    if (!mapInstance || !mapInstance.getSource(sourceId)) return;
    try {
        const layersToRemove = [clusterLayerId, countLayerId, pointLayerId];
        layersToRemove.forEach(layerId => { if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId); });
        mapInstance.removeSource(sourceId);
    } catch(error) { console.error(`Error removing source/layer for ${sourceId}:`, error); }
  }, []);

  // --- Effect for Managing Hotel Layers ---
  useEffect(() => {
    if (!map) return;
    const clusterPaint = { 'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'], 'circle-radius': ['step', ['get', 'point_count'], 15, 100, 20, 750, 25] };
    const pointPaint = { 'circle-color': '#11b4da', 'circle-radius': 5, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' };
    if (hotelsVisible) addPoiLayer(map, 'hotels', HOTELS_SOURCE_ID, HOTELS_URL, HOTELS_CLUSTER_LAYER_ID, HOTELS_CLUSTER_COUNT_LAYER_ID, HOTELS_UNCLUSTERED_LAYER_ID, clusterPaint, pointPaint);
    else removePoiLayer(map, HOTELS_SOURCE_ID, HOTELS_CLUSTER_LAYER_ID, HOTELS_CLUSTER_COUNT_LAYER_ID, HOTELS_UNCLUSTERED_LAYER_ID);
  }, [map, hotelsVisible, addPoiLayer, removePoiLayer]);

  // --- Effect for Managing Shelter Layers ---
  useEffect(() => {
    if (!map) return;
     const clusterPaint = { 'circle-color': ['step', ['get', 'point_count'], '#FFA500', 100, '#FFD700', 750, '#FF8C00'], 'circle-radius': ['step', ['get', 'point_count'], 15, 100, 20, 750, 25] };
    const pointPaint = { 'circle-color': '#FF4500', 'circle-radius': 5, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' };
    if (sheltersVisible) addPoiLayer(map, 'shelters', SHELTERS_SOURCE_ID, SHELTERS_URL, SHELTERS_CLUSTER_LAYER_ID, SHELTERS_CLUSTER_COUNT_LAYER_ID, SHELTERS_UNCLUSTERED_LAYER_ID, clusterPaint, pointPaint);
    else removePoiLayer(map, SHELTERS_SOURCE_ID, SHELTERS_CLUSTER_LAYER_ID, SHELTERS_CLUSTER_COUNT_LAYER_ID, SHELTERS_UNCLUSTERED_LAYER_ID);
  }, [map, sheltersVisible, addPoiLayer, removePoiLayer]);


  // --- Effect for Map Event Listeners (Clusters, Popups, Hover) ---
  useEffect(() => {
    // Check for map AND BOTH context functions needed
    if (!map || !setDestinationPoint || !setViaPoint) return;

    if (activePopup.current) activePopup.current.remove();

    const handleClusterClick = (e, sourceId) => { /* ... cluster click logic ... */
        const features = map.queryRenderedFeatures(e.point, { layers: [e.features[0].layer.id] });
        if (!features.length) return;
        const clusterId = features[0].properties.cluster_id;
        map.getSource(sourceId).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return console.error("Error getting expansion zoom:", err);
          map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom + 0.5 });
        });
    };

    const handlePointClick = (e) => {
        const feature = e.features[0];
        if (!feature?.geometry?.coordinates) return;

        const coordinates = feature.geometry.coordinates.slice();
        const properties = feature.properties;
        const name = properties.name || 'Unnamed Point';
        const website = properties.website;
        const websiteDisplay = website ? `<a href="${website.startsWith('http') ? website : '//' + website}" target="_blank" rel="noopener noreferrer">${website}</a>` : "No website available";
        const coords_lng = parseFloat(coordinates[0]);
        const coords_lat = parseFloat(coordinates[1]);
        if (isNaN(coords_lng) || isNaN(coords_lat)) return;

        while (Math.abs(e.lngLat.lng - coords_lng) > 180) {
            coordinates[0] += e.lngLat.lng > coords_lng ? 360 : -360;
        }

        if (activePopup.current) activePopup.current.remove();

        // Updated Popup Content with BOTH buttons
        const popupContent = `
        <div style="font-family: 'Inter', sans-serif; max-width: 200px; display: flex; flex-direction: column; gap: 5px;">
          <div style="margin-bottom: 5px;">
            <strong style="font-size: 1.05em;">${name}</strong><br>
            <span style="font-size: 0.9em; color: #555;">${websiteDisplay}</span>
          </div>
          <button class="mapboxgl-popup-button poi-set-destination-button" data-action="set-destination" data-lng="${coords_lng}" data-lat="${coords_lat}" data-name="${name.replace(/"/g, '"')}">
             Set as Destination
          </button>
          <button class="mapboxgl-popup-button poi-set-via-button" data-action="set-via" data-lng="${coords_lng}" data-lat="${coords_lat}" data-name="${name.replace(/"/g, '"')}">
             Set as Via Point
          </button>
        </div>
      `;

      const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, anchor: 'bottom', offset: 15 })
        .setLngLat([coords_lng, coords_lat])
        .setHTML(popupContent)
        .addTo(map);
      activePopup.current = popup;
    };


    const handlePopupAction = (event) => {
        const destButton = event.target.closest('button[data-action="set-destination"]');
        const viaButton = event.target.closest('button[data-action="set-via"]');
        if (!destButton && !viaButton) return;

        const button = destButton || viaButton;
        const lng = parseFloat(button.dataset.lng);
        const lat = parseFloat(button.dataset.lat);
        const name = button.dataset.name;
        if (isNaN(lng) || isNaN(lat)) return;

        if (destButton) setDestinationPoint([lng, lat], name); // Call appropriate context function
        else if (viaButton) setViaPoint([lng, lat], name);   // Call appropriate context function

        if (activePopup.current) { activePopup.current.remove(); activePopup.current = null; }
    };
    const mapContainer = map.getContainer();
    mapContainer.addEventListener('click', handlePopupAction);


    const handleMouseEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
    const handleMouseLeave = () => { map.getCanvas().style.cursor = ''; };
    const hotelLayers = [HOTELS_CLUSTER_LAYER_ID, HOTELS_UNCLUSTERED_LAYER_ID];
    const shelterLayers = [SHELTERS_CLUSTER_LAYER_ID, SHELTERS_UNCLUSTERED_LAYER_ID];

    map.on('click', HOTELS_CLUSTER_LAYER_ID, (e) => handleClusterClick(e, HOTELS_SOURCE_ID));
    map.on('click', HOTELS_UNCLUSTERED_LAYER_ID, handlePointClick);
    hotelLayers.forEach(layer => { map.on('mouseenter', layer, handleMouseEnter); map.on('mouseleave', layer, handleMouseLeave); });

    map.on('click', SHELTERS_CLUSTER_LAYER_ID, (e) => handleClusterClick(e, SHELTERS_SOURCE_ID));
    map.on('click', SHELTERS_UNCLUSTERED_LAYER_ID, handlePointClick);
    shelterLayers.forEach(layer => { map.on('mouseenter', layer, handleMouseEnter); map.on('mouseleave', layer, handleMouseLeave); });

    return () => { // Cleanup
      mapContainer.removeEventListener('click', handlePopupAction);
      // Remove other listeners by reference or use map.off without handler for type/layer combo
       map.off('click', HOTELS_CLUSTER_LAYER_ID); // Example simple removal
       map.off('click', HOTELS_UNCLUSTERED_LAYER_ID);
       hotelLayers.forEach(layer => { map.off('mouseenter', layer); map.off('mouseleave', layer); });
       map.off('click', SHELTERS_CLUSTER_LAYER_ID);
       map.off('click', SHELTERS_UNCLUSTERED_LAYER_ID);
       shelterLayers.forEach(layer => { map.off('mouseenter', layer); map.off('mouseleave', layer); });

      if (activePopup.current) activePopup.current.remove();
    };
  // Update dependencies to include setViaPoint
  }, [map, setDestinationPoint, setViaPoint]);


  // --- Render Toggle Buttons ---
  return (
    <div className="poi-layers-controls">
       <h4>Points of Interest</h4>
       <div className="poi-button-container">
        <button
          id="showHotels"
          className="button-base button-secondary"
          onClick={() => setHotelsVisible(!hotelsVisible)}
          aria-pressed={hotelsVisible}
        >
          {hotelsVisible ? 'Hide Hotels' : 'Show Hotels'}
        </button>
        <button
          id="showShelters"
          className="button-base button-secondary"
          onClick={() => setSheltersVisible(!sheltersVisible)}
          aria-pressed={sheltersVisible}
        >
          {sheltersVisible ? 'Hide Shelters' : 'Show Shelters'}
        </button>
      </div>
       <p className="poi-attribution">Note: Data © OpenStreetMap contributors.</p>
    </div>
  );
};

export default PoiLayers;