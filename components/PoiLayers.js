// components/PoiLayers.jsx
'use client';

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapContext } from './map'; // Adjust path if needed
import { useGeocoders } from './geocoder'; // Adjust path if needed
import { poiConfiguration } from './poiConfig'; // Import configuration from standalone file

// Helper function to generate initial visibility state from the imported config
const getInitialVisibility = () => {
    return poiConfiguration.reduce((acc, poi) => {
        acc[poi.id] = false; // Start with all layers hidden
        return acc;
    }, {});
};


const PoiLayers = () => {
    const map = useContext(MapContext); // Get map instance from context
    const { setDestinationPoint, setViaPoint } = useGeocoders(); // Get geocoder setters from context

    // State to track visibility of each POI type defined in poiConfig.js
    const [visiblePoiTypes, setVisiblePoiTypes] = useState(getInitialVisibility);
    // Ref to keep track of the currently open popup
    const activePopup = useRef(null);

    // --- Generic Helper Function to Add a Vector Tile Layer ---
    // Fetches data from S3 based on config
    const addVectorPoiLayer = useCallback((mapInstance, config) => {
        // Destructure config for the specific POI type
        const {
            sourceId, tileUrlTemplate, bounds, maxZoom,
            clusterLayerId, countLayerId, pointLayerId, sourceLayerName,
            clusterPaint, pointPaint
        } = config;

        // Prevent adding if source already exists or map isn't ready
        if (!mapInstance || mapInstance.getSource(sourceId)) {
             console.log(`Source ${sourceId} already exists or map not ready. Skipping add.`);
             return;
        }

        // Use the S3 URL directly from the config
        const finalTileUrl = tileUrlTemplate;

        console.log(`Adding source ${sourceId} using URL: ${finalTileUrl}`);

        try {
            // --- Add Source (using the URL from config) ---
            mapInstance.addSource(sourceId, {
                type: 'vector',
                tiles: [finalTileUrl], // Use the absolute S3 URL from config
                bounds: bounds,        // Optional bounds from config
                maxzoom: maxZoom       // Max zoom of the tileset from config
            });

            // --- Add Cluster Circle Layer ---
            mapInstance.addLayer({
                id: clusterLayerId, type: 'circle', source: sourceId, 'source-layer': sourceLayerName,
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': [ 'step', ['get', 'point_count'], clusterPaint.smallColor, clusterPaint.mediumThreshold, clusterPaint.mediumColor, clusterPaint.largeThreshold, clusterPaint.largeColor ],
                    'circle-radius': [ 'step', ['get', 'point_count'], clusterPaint.smallRadius, clusterPaint.mediumThreshold, clusterPaint.mediumRadius, clusterPaint.largeThreshold, clusterPaint.largeRadius ],
                    'circle-stroke-width': 1, 'circle-stroke-color': '#fff'
                 }
            });

            // --- Add Cluster Count Layer ---
            mapInstance.addLayer({
                id: countLayerId, type: 'symbol', source: sourceId, 'source-layer': sourceLayerName,
                filter: ['has', 'point_count'],
                layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 12, 'text-allow-overlap': true },
                paint: { 'text-color': '#ffffff' }
            });

            // --- Add Unclustered Point Layer ---
            mapInstance.addLayer({
                id: pointLayerId, type: 'circle', source: sourceId, 'source-layer': sourceLayerName,
                filter: ['!', ['has', 'point_count']],
                paint: pointPaint // Use pointPaint style from config
            });

            console.log(`Successfully added layers for ${sourceId}`);

        } catch (error) {
            // Log errors during layer/source addition
            console.error(`Error adding source/layers for ${sourceId}:`, error);
            console.error(`Tile URL used: ${finalTileUrl}`);
        }
    }, []); // useCallback with empty dependency array

    // --- Generic Helper Function to Remove a Vector Tile Layer ---
    const removeVectorPoiLayer = useCallback((mapInstance, config) => {
        const { sourceId, clusterLayerId, countLayerId, pointLayerId } = config;
        if (!mapInstance) return;

        console.log(`Removing layers and source for ${sourceId}`);
        const layersToRemove = [clusterLayerId, countLayerId, pointLayerId];
        try {
            layersToRemove.forEach(layerId => {
                if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId);
            });
            if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
             console.log(`Successfully removed ${sourceId}`);
        } catch(error) {
            console.error(`Error removing source/layers for ${sourceId}:`, error);
        }
    }, []); // useCallback with empty dependency array

    // --- Effect for Managing Layer Visibility ---
    // Adds/Removes layers based on the 'visiblePoiTypes' state changes
    useEffect(() => {
        if (!map) return; // Ensure map is loaded

        // Iterate through all configured POI types
        poiConfiguration.forEach(config => {
            const isVisible = visiblePoiTypes[config.id]; // Check current visibility state
            const sourceExists = map.getSource(config.sourceId); // Check if Mapbox source exists

            if (isVisible && !sourceExists) {
                addVectorPoiLayer(map, config); // Add layers if visible and not existing
            } else if (!isVisible && sourceExists) {
                removeVectorPoiLayer(map, config); // Remove layers if not visible but existing
            }
        });

    }, [map, visiblePoiTypes, addVectorPoiLayer, removeVectorPoiLayer]); // Dependencies trigger effect run


    // --- Effect for Handling Expected Mapbox Tile Errors ---
    // Listens for map 'error' events to suppress known tile loading errors
    useEffect(() => {
        if (!map) return; // Don't run if map isn't available

        // Define the error handler
        const handleMapError = (e) => {
            // Check if it's a 403/404 error when fetching tiles from our configured sources
            const isTileError = e.error?.message?.includes('Failed to fetch') ||
                                e.error?.message?.includes('Not Found') ||
                                e.error?.message?.includes('Forbidden');
            const is40xStatus = e.error?.status === 404 || e.error?.status === 403;
            const isFromMySource = e.sourceId && poiConfiguration.some(config => config.sourceId === e.sourceId);

            if (isTileError && is40xStatus && isFromMySource) {
                // This is likely an expected error for a non-existent tile. Suppress it.
                return;
            }
            // Log any other unexpected Mapbox errors
            console.error('Mapbox error:', e.error?.message || e);
        };

        // Attach the listener
        map.on('error', handleMapError);
        console.log("Mapbox error handler attached.");

        // Cleanup function: remove the listener when component unmounts or map changes
        return () => {
            if (map) {
                map.off('error', handleMapError);
                console.log("Mapbox error handler detached.");
            }
        };
    }, [map]); // Run only when the map instance changes


    // --- Effect for Map Event Listeners (Popups, Hover, Clicks) ---
    // Attaches/Detaches interaction listeners based on POI layer visibility
    useEffect(() => {
        // Ensure map and geocoder setters are ready
        if (!map || !setDestinationPoint || !setViaPoint) return;

        // Determine if any POI type is currently set to visible
        const anyPoiVisible = Object.values(visiblePoiTypes).some(isVisible => isVisible);

        // If no POI types are visible, don't attach interaction listeners
        if (!anyPoiVisible) {
            return; // Exit early, cleanup below will handle removals if needed
        }

        console.log("Attaching map interaction listeners for active POI layers.");

        // Close any previously open popup
        if (activePopup.current) {
            activePopup.current.remove();
            activePopup.current = null;
        }

        // --- Generate lists of all potential layer IDs from config ---
        const allClusterLayerIds = poiConfiguration.map(p => p.clusterLayerId);
        const allPointLayerIds = poiConfiguration.map(p => p.pointLayerId);

        // --- Generic Event Handlers ---
        const handleClusterClick = (e) => {
            const features = e.features;
            if (!features || !features.length) return;
            const feature = features[0];
            const sourceId = feature.layer.source;
            const source = map.getSource(sourceId);
            const clusterId = feature.properties.cluster_id;

            if (source && typeof source.getClusterExpansionZoom === 'function') {
                source.getClusterExpansionZoom(clusterId, (err, zoom) => {
                    if (!err) map.easeTo({ center: feature.geometry.coordinates, zoom: zoom + 0.5 });
                });
            } else {
                map.easeTo({ center: feature.geometry.coordinates, zoom: map.getZoom() + 2 });
            }
        };

        const handlePointClick = (e) => {
            if (!e.features || !e.features.length) return;
            const feature = e.features[0];
            if (!feature?.geometry?.coordinates || feature.properties.cluster || !feature.properties) return;

            const clickedLayerId = feature.layer.id;
            const config = poiConfiguration.find(p => p.pointLayerId === clickedLayerId);

            if (!config) return; // Should have a config if layer exists

            const { popupProperties } = config;
            const coordinates = feature.geometry.coordinates.slice();
            const properties = feature.properties;
            const name = properties[popupProperties.nameProp] || popupProperties.defaultName;
            const websitePropValue = properties[popupProperties.websiteProp];
            const websiteDisplay = websitePropValue
                ? `<a href="${websitePropValue.startsWith('http') ? websitePropValue : '//' + websitePropValue}" target="_blank" rel="noopener noreferrer">${websitePropValue}</a>`
                : "No website available";
            const coords_lng = parseFloat(coordinates[0]);
            const coords_lat = parseFloat(coordinates[1]);
            if (isNaN(coords_lng) || isNaN(coords_lat)) return;

            if (activePopup.current) activePopup.current.remove();

            const popupContent = `<div style="font-family: 'Inter', sans-serif; max-width: 200px; display: flex; flex-direction: column; gap: 5px;"><div style="margin-bottom: 5px;"><strong style="font-size: 1.05em;">${name}</strong><br><span style="font-size: 0.9em; color: #555;">${websiteDisplay}</span></div><button class="mapboxgl-popup-button poi-set-destination-button" data-action="set-destination" data-lng="${coords_lng}" data-lat="${coords_lat}" data-name="${name.replace(/"/g, '"')}">Set as Destination</button><button class="mapboxgl-popup-button poi-set-via-button" data-action="set-via" data-lng="${coords_lng}" data-lat="${coords_lat}" data-name="${name.replace(/"/g, '"')}">Set as Via Point</button></div>`;

            const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, anchor: 'bottom', offset: 15 })
                .setLngLat([coords_lng, coords_lat]).setHTML(popupContent).addTo(map);
            activePopup.current = popup;
        };

        // Handles clicks on buttons inside the popup
        const handlePopupAction = (event) => {
            const targetButton = event.target.closest('button[data-action]');
            if (!targetButton) return;
            const action = targetButton.dataset.action;
            const lng = parseFloat(targetButton.dataset.lng);
            const lat = parseFloat(targetButton.dataset.lat);
            const name = targetButton.dataset.name;
            if (isNaN(lng) || isNaN(lat)) return;

            if (action === "set-destination") setDestinationPoint([lng, lat], name);
            else if (action === "set-via") setViaPoint([lng, lat], name);

            if (activePopup.current) {
                activePopup.current.remove();
                activePopup.current = null;
            }
        };

        // Handlers for changing cursor style on hover
        const handleMouseEnter = () => { if (map) map.getCanvas().style.cursor = 'pointer'; };
        const handleMouseLeave = () => { if (map) map.getCanvas().style.cursor = ''; };

        // --- Attach Event Listeners ---
        const mapContainer = map.getContainer();
        mapContainer.addEventListener('click', handlePopupAction); // Delegate popup clicks
        map.on('click', allClusterLayerIds, handleClusterClick); // Clicks on clusters
        map.on('click', allPointLayerIds, handlePointClick);     // Clicks on individual points
        map.on('mouseenter', allClusterLayerIds, handleMouseEnter); // Hover over clusters
        map.on('mouseleave', allClusterLayerIds, handleMouseLeave); // Hover off clusters
        map.on('mouseenter', allPointLayerIds, handleMouseEnter); // Hover over points
        map.on('mouseleave', allPointLayerIds, handleMouseLeave); // Hover off points

        // --- Cleanup Function for THIS effect ---
        return () => {
            console.log("Detaching map interaction listeners for POI layers.");
            mapContainer.removeEventListener('click', handlePopupAction); // Remove delegated listener
            if (map && map.style) { // Check map is still valid before removing layer listeners
                 const allLayerIds = [...allClusterLayerIds, ...allPointLayerIds];
                 try {
                    map.off('click', allClusterLayerIds, handleClusterClick);
                    map.off('click', allPointLayerIds, handlePointClick);
                    map.off('mouseenter', allLayerIds, handleMouseEnter);
                    map.off('mouseleave', allLayerIds, handleMouseLeave);
                 } catch(e) { /* Ignore errors during cleanup */ }
            }
            if (activePopup.current) { // Ensure popup is closed
                activePopup.current.remove();
                activePopup.current = null;
            }
        };
    // Dependencies: Re-run if map, setters, or the visibility state changes
    }, [map, setDestinationPoint, setViaPoint, visiblePoiTypes]);


    // --- Handler to toggle visibility for a specific POI type ---
    // Updates the visiblePoiTypes state when a button is clicked
    const handleTogglePoiVisibility = (poiId) => {
        setVisiblePoiTypes(prev => ({
            ...prev,
            [poiId]: !prev[poiId] // Toggle the boolean state for the specific id
        }));
    };


    // --- Render Component UI ---
    return (
        <div className="poi-layers-controls">
            <h4>Points of Interest</h4>
            {/* Container for the toggle buttons */}
            <div className="poi-button-container">
                {/* Dynamically create buttons based on the imported poiConfiguration */}
                {poiConfiguration.map((poi) => (
                    <button
                        key={poi.id} // React list key
                        id={`show${poi.buttonLabel.replace(/\s+/g, '')}`} // e.g., id="showShelters"
                        className={`button-base button-secondary ${visiblePoiTypes[poi.id] ? 'active' : ''}`}
                        onClick={() => handleTogglePoiVisibility(poi.id)} // Attach toggle handler
                        aria-pressed={visiblePoiTypes[poi.id]} // Accessibility
                    >
                        {/* Display Hide/Show based on state */}
                        {visiblePoiTypes[poi.id] ? `Hide ${poi.buttonLabel}` : `Show ${poi.buttonLabel}`}
                    </button>
                ))}
            </div>
            {/* Static attribution text */}
            <p className="poi-attribution">Note: Base map data © Mapbox © OpenStreetMap. POI data adapted.</p>
        </div>
    );
};

export default PoiLayers;