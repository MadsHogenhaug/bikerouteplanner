import { useEffect, useRef } from 'react';
import { poiConfiguration } from '@/components/poiConfig';

const addPoiLayer = (map, config) => {
  if (map.getSource(config.sourceId)) return;

  const {
    sourceId, sourceLayerName, tileUrlTemplate, bounds, maxZoom,
    clusterLayerId, countLayerId, pointLayerId,
    clusterPaint, pointPaint,
  } = config;

  map.addSource(sourceId, {
    type: 'vector',
    tiles: [tileUrlTemplate],
    bounds,
    maxzoom: maxZoom,
  });

  map.addLayer({
    id: clusterLayerId,
    type: 'circle',
    source: sourceId,
    'source-layer': sourceLayerName,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step', ['get', 'point_count'],
        clusterPaint.smallColor,
        clusterPaint.mediumThreshold, clusterPaint.mediumColor,
        clusterPaint.largeThreshold, clusterPaint.largeColor,
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        clusterPaint.smallRadius,
        clusterPaint.mediumThreshold, clusterPaint.mediumRadius,
        clusterPaint.largeThreshold, clusterPaint.largeRadius,
      ],
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff',
    },
  });

  map.addLayer({
    id: countLayerId,
    type: 'symbol',
    source: sourceId,
    'source-layer': sourceLayerName,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#ffffff' },
  });

  map.addLayer({
    id: pointLayerId,
    type: 'circle',
    source: sourceId,
    'source-layer': sourceLayerName,
    filter: ['!', ['has', 'point_count']],
    paint: pointPaint,
  });
};

const removePoiLayer = (map, config) => {
  [config.clusterLayerId, config.countLayerId, config.pointLayerId].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource(config.sourceId)) map.removeSource(config.sourceId);
};

const isExpectedTileError = (event) => {
  const message = event.error?.message || '';
  const is40x = event.error?.status === 404 || event.error?.status === 403;
  const looksLikeTileFetch =
    message.includes('Failed to fetch') ||
    message.includes('Not Found') ||
    message.includes('Forbidden');
  const fromOurSource = event.sourceId &&
    poiConfiguration.some((c) => c.sourceId === event.sourceId);
  return looksLikeTileFetch && is40x && fromOurSource;
};

export function usePoiLayers(map, visiblePoiTypes) {
  // Ref so style.load handler always reads current visibility.
  const visibleRef = useRef(visiblePoiTypes);
  useEffect(() => { visibleRef.current = visiblePoiTypes; }, [visiblePoiTypes]);

  // Add/remove layers as visibility changes.
  useEffect(() => {
    if (!map) return;
    poiConfiguration.forEach((config) => {
      const shouldShow = !!visiblePoiTypes[config.id];
      const isShown = !!map.getSource(config.sourceId);
      try {
        if (shouldShow && !isShown) addPoiLayer(map, config);
        else if (!shouldShow && isShown) removePoiLayer(map, config);
      } catch (error) {
        console.error(`Failed to toggle POI ${config.id}:`, error);
      }
    });
  }, [map, visiblePoiTypes]);

  // Re-add visible layers after style changes.
  useEffect(() => {
    if (!map) return undefined;
    const handle = () => {
      poiConfiguration.forEach((config) => {
        if (visibleRef.current[config.id]) {
          try { addPoiLayer(map, config); } catch (error) {
            console.error(`Failed to restore POI ${config.id}:`, error);
          }
        }
      });
    };
    map.on('style.load', handle);
    return () => map.off('style.load', handle);
  }, [map]);

  // Suppress expected 403/404s on our tile sources; log others.
  useEffect(() => {
    if (!map) return undefined;
    const handle = (event) => {
      if (isExpectedTileError(event)) return;
      console.error('Mapbox error:', event.error?.message || event);
    };
    map.on('error', handle);
    return () => map.off('error', handle);
  }, [map]);
}
