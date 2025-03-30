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
  const { setDestinationPoint } = useGeocoders(); // Get the function from geocoder context

  const [hotelsVisible, setHotelsVisible] = useState(false);
  const [sheltersVisible, setSheltersVisible] = useState(false);

  // Ref to store the currently active popup to close it if another is opened
  const activePopup = useRef(null);

  // --- Helper Function to Add Layers ---
  const addPoiLayer = useCallback((mapInstance, idPrefix, sourceId, dataUrl, clusterLayerId, countLayerId, pointLayerId, clusterPaint, pointPaint) => {
    // Prevent adding if source already exists
    if (!mapInstance || mapInstance.getSource(sourceId)) return;

    try {
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: dataUrl,
          cluster: true,
          clusterMaxZoom: 14, // Lower zoom level encourages clustering more
          clusterRadius: 50, // Pixels radius for clustering
        });

        // Add cluster layer
        mapInstance.addLayer({
          id: clusterLayerId,
          type: 'circle',
          source: sourceId,
          filter: ['has', 'point_count'],
          paint: clusterPaint,
        });

        // Add cluster count layer
        mapInstance.addLayer({
          id: countLayerId,
          type: 'symbol',
          source: sourceId,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-allow-overlap': true,
          },
          paint: {
             'text-color': '#ffffff' // White text for contrast
          }
        });

        // Add unclustered point layer
        mapInstance.addLayer({
          id: pointLayerId,
          type: 'circle',
          source: sourceId,
          filter: ['!', ['has', 'point_count']],
          paint: pointPaint,
        });
    } catch (error) {
         console.error(`Error adding source/layer for ${idPrefix}:`, error);
    }
  }, []); // No dependencies needed for this helper itself

  // --- Helper Function to Remove Layers ---
  const removePoiLayer = useCallback((mapInstance, sourceId, clusterLayerId, countLayerId, pointLayerId) => {
    if (!mapInstance || !mapInstance.getSource(sourceId)) return; // Doesn't exist

    try {
        const layersToRemove = [clusterLayerId, countLayerId, pointLayerId];
        layersToRemove.forEach(layerId => {
          if (mapInstance.getLayer(layerId)) {
            mapInstance.removeLayer(layerId);
          }
        });
        // Source must be removed after layers using it
        mapInstance.removeSource(sourceId);
    } catch(error) {
        console.error(`Error removing source/layer for ${sourceId}:`, error);
    }
  }, []); // No dependencies needed for this helper itself

  // --- Effect for Managing Hotel Layers ---
  useEffect(() => {
    // Map must exist to manage layers
    if (!map) return;

    const clusterPaint = {
        'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
        'circle-radius': ['step', ['get', 'point_count'], 15, 100, 20, 750, 25]
    };
    const pointPaint = {
        'circle-color': '#11b4da', 'circle-radius': 5, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff'
    };

    if (hotelsVisible) {
      addPoiLayer(map, 'hotels', HOTELS_SOURCE_ID, HOTELS_URL, HOTELS_CLUSTER_LAYER_ID, HOTELS_CLUSTER_COUNT_LAYER_ID, HOTELS_UNCLUSTERED_LAYER_ID, clusterPaint, pointPaint);
    } else {
      removePoiLayer(map, HOTELS_SOURCE_ID, HOTELS_CLUSTER_LAYER_ID, HOTELS_CLUSTER_COUNT_LAYER_ID, HOTELS_UNCLUSTERED_LAYER_ID);
    }
    // This effect depends on map availability and visibility state
  }, [map, hotelsVisible, addPoiLayer, removePoiLayer]);

  // --- Effect for Managing Shelter Layers ---
  useEffect(() => {
    // Map must exist
    if (!map) return;

     const clusterPaint = {
        'circle-color': ['step', ['get', 'point_count'], '#FFA500', 100, '#FFD700', 750, '#FF8C00'],
        'circle-radius': ['step', ['get', 'point_count'], 15, 100, 20, 750, 25]
    };
    const pointPaint = {
        'circle-color': '#FF4500', 'circle-radius': 5, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff'
    };

    if (sheltersVisible) {
      addPoiLayer(map, 'shelters', SHELTERS_SOURCE_ID, SHELTERS_URL, SHELTERS_CLUSTER_LAYER_ID, SHELTERS_CLUSTER_COUNT_LAYER_ID, SHELTERS_UNCLUSTERED_LAYER_ID, clusterPaint, pointPaint);
    } else {
      removePoiLayer(map, SHELTERS_SOURCE_ID, SHELTERS_CLUSTER_LAYER_ID, SHELTERS_CLUSTER_COUNT_LAYER_ID, SHELTERS_UNCLUSTERED_LAYER_ID);
    }
    // Depends on map and visibility state
  }, [map, sheltersVisible, addPoiLayer, removePoiLayer]);


  // --- Effect for Map Event Listeners (Clusters, Popups, Hover) ---
  useEffect(() => {
    // Map must exist and setDestinationPoint function must be available from context
    if (!map || !setDestinationPoint) return;

    // Close any existing popup before attaching new listeners or when effect re-runs/unmounts
    if (activePopup.current) {
        activePopup.current.remove();
        activePopup.current = null;
    }

    // --- Click Handlers ---
    const handleClusterClick = (e, sourceId) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [e.features[0].layer.id] });
      if (!features.length) return;
      const clusterId = features[0].properties.cluster_id;
      map.getSource(sourceId).getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) {
            console.error("Error getting expansion zoom:", err);
            return;
        };
        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom + 0.5, // Add a little extra zoom
        });
      });
    };

    const handlePointClick = (e) => {
      const feature = e.features[0];
      if (!feature || !feature.geometry?.coordinates) return;

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

      const popupContent = `
        <div style="font-family: 'Inter', sans-serif; max-width: 200px;">
          <strong style="font-size: 1.05em;">${name}</strong><br>
          <span style="font-size: 0.9em; color: #555;">${websiteDisplay}</span><br>
          <button class="mapboxgl-popup-button poi-set-destination-button" data-action="set-destination" data-lng="${coords_lng}" data-lat="${coords_lat}" data-name="${name.replace(/"/g, '"')}">
             Set as Destination
          </button>
        </div>
      `;

      const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, anchor: 'bottom', offset: 15 })
        .setLngLat([coords_lng, coords_lat])
        .setHTML(popupContent)
        .addTo(map);

      activePopup.current = popup;
    };


    // --- Delegated Click Handler for Popups ---
    const handlePopupAction = (event) => {
        // Use a specific class for the button to avoid conflicts
        const button = event.target.closest('button.poi-set-destination-button[data-action="set-destination"]');
        if (!button || !map.getCanvas().contains(event.target)) return;

        const lng = parseFloat(button.dataset.lng);
        const lat = parseFloat(button.dataset.lat);
        const name = button.dataset.name;

        if (!isNaN(lng) && !isNaN(lat)) {
            setDestinationPoint([lng, lat], name); // Call function from context
            if (activePopup.current) {
                activePopup.current.remove();
                activePopup.current = null;
            }
        }
    };
    const mapContainer = map.getContainer();
    mapContainer.addEventListener('click', handlePopupAction);


    // --- Hover Handlers ---
    const handleMouseEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
    const handleMouseLeave = () => { map.getCanvas().style.cursor = ''; };

    // --- Layer IDs for listeners ---
    const hotelLayers = [HOTELS_CLUSTER_LAYER_ID, HOTELS_UNCLUSTERED_LAYER_ID];
    const shelterLayers = [SHELTERS_CLUSTER_LAYER_ID, SHELTERS_UNCLUSTERED_LAYER_ID];

    // --- Attach Listeners ---
    map.on('click', HOTELS_CLUSTER_LAYER_ID, (e) => handleClusterClick(e, HOTELS_SOURCE_ID));
    map.on('click', HOTELS_UNCLUSTERED_LAYER_ID, handlePointClick);
    hotelLayers.forEach(layer => {
        map.on('mouseenter', layer, handleMouseEnter);
        map.on('mouseleave', layer, handleMouseLeave);
    });

    map.on('click', SHELTERS_CLUSTER_LAYER_ID, (e) => handleClusterClick(e, SHELTERS_SOURCE_ID));
    map.on('click', SHELTERS_UNCLUSTERED_LAYER_ID, handlePointClick);
    shelterLayers.forEach(layer => {
        map.on('mouseenter', layer, handleMouseEnter);
        map.on('mouseleave', layer, handleMouseLeave);
    });

    // --- Cleanup Function ---
    return () => {
      mapContainer.removeEventListener('click', handlePopupAction);

      map.off('click', HOTELS_CLUSTER_LAYER_ID, (e) => handleClusterClick(e, HOTELS_SOURCE_ID));
      map.off('click', HOTELS_UNCLUSTERED_LAYER_ID, handlePointClick);
       hotelLayers.forEach(layer => {
          map.off('mouseenter', layer, handleMouseEnter);
          map.off('mouseleave', layer, handleMouseLeave);
      });

      map.off('click', SHELTERS_CLUSTER_LAYER_ID, (e) => handleClusterClick(e, SHELTERS_SOURCE_ID));
      map.off('click', SHELTERS_UNCLUSTERED_LAYER_ID, handlePointClick);
       shelterLayers.forEach(layer => {
          map.off('mouseenter', layer, handleMouseEnter);
          map.off('mouseleave', layer, handleMouseLeave);
      });

      if (activePopup.current) activePopup.current.remove();
    };
  // This effect depends on map availability and the setDestinationPoint function reference
  }, [map, setDestinationPoint]);


  // --- Render Toggle Buttons ---
  return (
    // Use class for styling from CSS modules/components
    <div className="poi-layers-controls">
       <h4>Points of Interest</h4>
       {/* Use class for styling button container */}
       <div className="poi-button-container">
        <button
          id="showHotels" // Keep ID only if strictly needed for external interaction/testing
          className="button-base button-secondary" // Use classes from components.css
          onClick={() => setHotelsVisible(!hotelsVisible)}
          aria-pressed={hotelsVisible} // Indicate toggle state
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