'use client';

import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { MapContext } from './map';
import { useGeocoders } from './geocoder';
import RouteOptions from './RouteOptions';
import ItineraryList from './ItineraryList';
import { useItineraryPlanner } from '@/hooks/useItineraryPlanner';
import { buildCustomModel } from '@/lib/customModel';
import { isEndpointStop, metersToKm, stopDeltaKm, stopTitle } from '@/lib/formatters';

const ROUTE_SOURCE_ID = 'route';
const ROUTE_LAYER_ID = 'route';
const STOP_MARKER_COLOR = {
  start: 'black',
  destination: 'red',
  Hotel: 'blue',
};

const DEFAULT_PREFS = {
  primary: '1.0',
  secondary: '1.0',
  tertiary: '1.0',
  bikeNetwork: '1.0',
  surface: '0.8',
  dailyDistance: '100',
};

const ITINERARY_WEIGHTS = { distanceDeviationWeight: 5, offRouteDeviationWeight: 0.02 };

const buildStopPopupHTML = (stop, prev, index) => {
  const deltaKm = stopDeltaKm(stop, prev);
  const title = stopTitle(stop);
  return [
    '<div class="itinerary-popup">',
    `<strong>${title}</strong><br/>`,
    `Dist: ${metersToKm(stop.routeDistance)} km<br/>`,
    index > 0 ? `(+${deltaKm.toFixed(1)} km)<br/>` : '',
    !isEndpointStop(stop) ? `Detour: ${stop.offRoute.toFixed(0)} m` : '',
    '</div>',
  ].join('');
};

async function fetchRoute(points, customModel) {
  const response = await fetch('/api/routing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points, custom_model: customModel }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error || `HTTP error (status ${response.status})`);
  }
  if (!data.paths?.length) throw new Error('No route found.');
  return data.paths[0];
}

const RouteFetcher = () => {
  const map = useContext(MapContext);
  const { startCoords, endCoords, viaPoints } = useGeocoders();
  const { planRouteItinerary, isPlanning, error: itineraryError } = useItineraryPlanner();

  const [routeData, setRouteData] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  const setPref = useCallback((key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const routeDataRef = useRef(null);
  const itineraryMarkersRef = useRef([]);
  useEffect(() => { routeDataRef.current = routeData; }, [routeData]);

  const clearRoute = useCallback(() => {
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
    if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
  }, [map]);

  const drawRoute = useCallback((route) => {
    if (!map || !route?.points?.coordinates) return;
    if (!map.isStyleLoaded()) {
      map.once('load', () => drawRoute(route));
      return;
    }
    clearRoute();

    map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: route.points });
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#1DB954', 'line-width': 8, 'line-opacity': 0.8 },
    });

    const coordinates = route.points.coordinates;
    if (coordinates.length > 0) {
      const bounds = coordinates.reduce(
        (b, coord) => b.extend(coord),
        new mapboxgl.LngLatBounds()
      );
      map.fitBounds(bounds, { padding: { top: 100, bottom: 50, left: 350, right: 50 }, maxZoom: 15 });
    }
  }, [map, clearRoute]);

  // Re-apply route after style change (setStyle wipes custom layers).
  useEffect(() => {
    if (!map) return;
    const handle = () => {
      if (routeDataRef.current) drawRoute(routeDataRef.current);
    };
    map.on('style.load', handle);
    return () => map.off('style.load', handle);
  }, [map, drawRoute]);

  const clearItinerary = useCallback(() => {
    itineraryMarkersRef.current.forEach((m) => m.remove());
    itineraryMarkersRef.current = [];
    setItinerary(null);
  }, []);

  // Plot itinerary markers.
  useEffect(() => {
    if (!map || !itinerary?.length) return undefined;
    const markers = itinerary.map((stop, i) => {
      const color = STOP_MARKER_COLOR[stop.type] || 'green';
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(buildStopPopupHTML(stop, itinerary[i - 1], i));
      return new mapboxgl.Marker({ color }).setLngLat(stop.coords).setPopup(popup).addTo(map);
    });
    itineraryMarkersRef.current = markers;
    return () => {
      markers.forEach((m) => m.remove());
      itineraryMarkersRef.current = [];
    };
  }, [map, itinerary]);

  const handleGetRoute = async () => {
    setRouteError('');
    clearRoute();
    clearItinerary();

    if (!startCoords || !endCoords) {
      setRouteError('Please select start and end locations.');
      return;
    }

    const incompleteVia = viaPoints.some((p) => !p.coords);
    if (incompleteVia) {
      setRouteError('Select locations for all via points or remove unused ones.');
      return;
    }

    const dailyDistNum = parseFloat(prefs.dailyDistance);
    if (!Number.isFinite(dailyDistNum) || dailyDistNum <= 0) {
      setRouteError('Enter a valid daily distance.');
      return;
    }

    const points = [
      startCoords,
      ...viaPoints.map((p) => p.coords),
      endCoords,
    ].filter((p) => Array.isArray(p) && p.length === 2);

    if (points.length < 2) {
      setRouteError('Valid start and end points required.');
      return;
    }

    setIsLoadingRoute(true);
    try {
      const route = await fetchRoute(points, buildCustomModel(prefs));
      setRouteData(route);
      drawRoute(route);
      setIsLoadingRoute(false);

      const result = await planRouteItinerary(route, dailyDistNum, ITINERARY_WEIGHTS);
      if (result) setItinerary(result);
    } catch (error) {
      console.error('Route fetch failed:', error);
      setRouteError(`Operation failed: ${error.message}`);
      clearRoute();
      clearItinerary();
      setIsLoadingRoute(false);
    }
  };

  const busy = isLoadingRoute || isPlanning;
  const buttonLabel = isLoadingRoute
    ? 'Fetching Route...'
    : isPlanning
      ? 'Planning Itinerary...'
      : 'Get Route & Plan Itinerary';

  return (
    <div className="route-fetcher">
      <button
        id="getRoute"
        className="button-base button-primary"
        onClick={handleGetRoute}
        disabled={busy}
      >
        {buttonLabel}
      </button>
      {routeError && <div className="route-error-message">Route Error: {routeError}</div>}
      {itineraryError && <div className="route-error-message">Itinerary Error: {itineraryError}</div>}

      <RouteOptions
        isOpen={isOptionsOpen}
        onToggle={() => setIsOptionsOpen((prev) => !prev)}
        prefs={prefs}
        setPref={setPref}
        disabled={busy}
      />

      <ItineraryList itinerary={itinerary} />
    </div>
  );
};

export default RouteFetcher;
