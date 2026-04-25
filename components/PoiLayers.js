'use client';

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { createRoot } from 'react-dom/client';

import { MapContext } from './map';
import { useGeocoders } from './geocoder';
import { poiConfiguration } from './poiConfig';
import { usePoiLayers } from '@/hooks/usePoiLayers';
import PoiPopup from './PoiPopup';

const initialVisibility = () =>
  poiConfiguration.reduce((acc, poi) => {
    acc[poi.id] = false;
    return acc;
  }, {});

const PoiLayers = () => {
  const map = useContext(MapContext);
  const { setDestinationPoint, setViaPoint } = useGeocoders();

  const [visiblePoiTypes, setVisiblePoiTypes] = useState(initialVisibility);

  usePoiLayers(map, visiblePoiTypes);

  const popupRef = useRef(null);
  const popupRootRef = useRef(null);

  const closePopup = useCallback(() => {
    if (popupRootRef.current) {
      popupRootRef.current.unmount();
      popupRootRef.current = null;
    }
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
  }, []);

  useEffect(() => closePopup, [closePopup]);

  const openPopup = useCallback((coords, name, website) => {
    if (!map) return;
    closePopup();

    const container = document.createElement('div');
    const root = createRoot(container);

    const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, anchor: 'bottom', offset: 15 })
      .setLngLat(coords)
      .setDOMContent(container)
      .addTo(map);

    popup.on('close', () => {
      if (popupRootRef.current === root) {
        root.unmount();
        popupRootRef.current = null;
        popupRef.current = null;
      }
    });

    const handleSetDestination = () => {
      setDestinationPoint(coords, name);
      closePopup();
    };
    const handleSetVia = () => {
      setViaPoint(coords, name);
      closePopup();
    };

    root.render(
      <PoiPopup
        name={name}
        website={website}
        onSetDestination={handleSetDestination}
        onSetVia={handleSetVia}
      />
    );

    popupRef.current = popup;
    popupRootRef.current = root;
  }, [map, closePopup, setDestinationPoint, setViaPoint]);

  // Map event handlers for clusters & points.
  useEffect(() => {
    if (!map) return undefined;

    const anyVisible = Object.values(visiblePoiTypes).some(Boolean);
    if (!anyVisible) {
      closePopup();
      return undefined;
    }

    const clusterLayerIds = poiConfiguration.map((p) => p.clusterLayerId);
    const pointLayerIds = poiConfiguration.map((p) => p.pointLayerId);

    const handleClusterClick = (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const source = map.getSource(feature.layer.source);
      const clusterId = feature.properties.cluster_id;
      if (source?.getClusterExpansionZoom) {
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (!err) map.easeTo({ center: feature.geometry.coordinates, zoom: zoom + 0.5 });
        });
      } else {
        map.easeTo({ center: feature.geometry.coordinates, zoom: map.getZoom() + 2 });
      }
    };

    const handlePointClick = (e) => {
      const feature = e.features?.[0];
      if (!feature?.geometry?.coordinates || feature.properties.cluster) return;

      const config = poiConfiguration.find((p) => p.pointLayerId === feature.layer.id);
      if (!config) return;

      const { popupProperties } = config;
      const [lng, lat] = feature.geometry.coordinates;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const name = feature.properties[popupProperties.nameProp] || popupProperties.defaultName;
      const website = feature.properties[popupProperties.websiteProp] || null;
      openPopup([lng, lat], name, website);
    };

    const setCursorPointer = () => { map.getCanvas().style.cursor = 'pointer'; };
    const clearCursor = () => { map.getCanvas().style.cursor = ''; };

    map.on('click', clusterLayerIds, handleClusterClick);
    map.on('click', pointLayerIds, handlePointClick);
    map.on('mouseenter', clusterLayerIds, setCursorPointer);
    map.on('mouseleave', clusterLayerIds, clearCursor);
    map.on('mouseenter', pointLayerIds, setCursorPointer);
    map.on('mouseleave', pointLayerIds, clearCursor);

    return () => {
      map.off('click', clusterLayerIds, handleClusterClick);
      map.off('click', pointLayerIds, handlePointClick);
      map.off('mouseenter', clusterLayerIds, setCursorPointer);
      map.off('mouseleave', clusterLayerIds, clearCursor);
      map.off('mouseenter', pointLayerIds, setCursorPointer);
      map.off('mouseleave', pointLayerIds, clearCursor);
      closePopup();
    };
  }, [map, visiblePoiTypes, openPopup, closePopup]);

  const togglePoi = (poiId) => {
    setVisiblePoiTypes((prev) => ({ ...prev, [poiId]: !prev[poiId] }));
  };

  return (
    <div className="poi-layers-controls">
      <h4>Points of Interest</h4>
      <div className="poi-button-container">
        {poiConfiguration.map((poi) => {
          const active = visiblePoiTypes[poi.id];
          return (
            <button
              key={poi.id}
              className={`button-base button-secondary ${active ? 'active' : ''}`}
              onClick={() => togglePoi(poi.id)}
              aria-pressed={active}
              type="button"
            >
              {active ? `Hide ${poi.buttonLabel}` : `Show ${poi.buttonLabel}`}
            </button>
          );
        })}
      </div>
      <p className="poi-attribution">
        Note: Base map data © Mapbox © OpenStreetMap. POI data adapted.
      </p>
    </div>
  );
};

export default PoiLayers;
