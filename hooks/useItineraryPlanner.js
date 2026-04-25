import { useState, useCallback } from 'react';

const HOTELS_URL = 'https://geojson-data-bikerouteplanner.s3.eu-north-1.amazonaws.com/denmark_hotels.geojson';
const SHELTERS_URL = 'https://geojson-data-bikerouteplanner.s3.eu-north-1.amazonaws.com/denmark_shelters.geojson';
const EARTH_RADIUS_M = 6371000;
const DEFAULT_OFF_ROUTE_THRESHOLD_M = 2500;

const toRadians = (deg) => (deg * Math.PI) / 180;

function haversineDistance(a, b) {
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(b[0] - a[0]);
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function computeCumulativeDistances(coordinates) {
  const cumulative = new Array(coordinates.length);
  cumulative[0] = 0;
  for (let i = 1; i < coordinates.length; i++) {
    cumulative[i] = cumulative[i - 1] + haversineDistance(coordinates[i - 1], coordinates[i]);
  }
  return cumulative;
}

// Module-scoped cache for lodging fetch — shared across component mounts.
let lodgingPromise = null;

async function fetchLodging() {
  if (lodgingPromise) return lodgingPromise;

  lodgingPromise = (async () => {
    const [hotelRes, shelterRes] = await Promise.all([fetch(HOTELS_URL), fetch(SHELTERS_URL)]);
    if (!hotelRes.ok || !shelterRes.ok) throw new Error('Failed to fetch lodging data');

    const [hotelData, shelterData] = await Promise.all([hotelRes.json(), shelterRes.json()]);

    const map = (type, defaultName) => (feature) => ({
      name: feature.properties?.name || defaultName,
      coords: feature.geometry?.coordinates,
      type,
    });
    const hasCoords = (entry) => Array.isArray(entry.coords) && entry.coords.length === 2;

    return [
      ...hotelData.features.map(map('Hotel', 'Unknown Hotel')).filter(hasCoords),
      ...shelterData.features.map(map('Shelter', 'Unknown Shelter')).filter(hasCoords),
    ];
  })().catch((error) => {
    console.error('Error loading lodging data:', error);
    lodgingPromise = null;
    return [];
  });

  return lodgingPromise;
}

function projectLodgingsOntoRoute(routeCoords, cumulativeDistances, lodgings, threshold) {
  if (!routeCoords.length || !lodgings.length) return [];

  return lodgings.reduce((acc, lodging) => {
    let minDist = Infinity;
    let bestIndex = -1;
    for (let i = 0; i < routeCoords.length; i++) {
      const d = haversineDistance(routeCoords[i], lodging.coords);
      if (d < minDist) { minDist = d; bestIndex = i; }
    }
    if (bestIndex !== -1 && minDist <= threshold) {
      acc.push({
        name: lodging.name,
        coords: lodging.coords,
        routeDistance: cumulativeDistances[bestIndex],
        offRoute: minDist,
        type: lodging.type,
      });
    }
    return acc;
  }, []);
}

async function calculateOptimalItinerary(route, targetDailyKm, weights = {}) {
  if (!route?.points?.coordinates || route.points.coordinates.length < 2) {
    console.warn('Invalid route data for itinerary planning.');
    return null;
  }

  const {
    distanceDeviationWeight = 5,
    offRouteDeviationWeight = 0.02,
    offRouteThreshold = DEFAULT_OFF_ROUTE_THRESHOLD_M,
  } = weights;

  const routeCoords = route.points.coordinates;
  const cumulative = computeCumulativeDistances(routeCoords);
  const totalDistance = cumulative[cumulative.length - 1];
  const targetMeters = targetDailyKm * 1000;

  const lodgings = await fetchLodging();
  const candidates = [
    { name: 'Start', coords: routeCoords[0], routeDistance: 0, offRoute: 0, type: 'start' },
    ...projectLodgingsOntoRoute(routeCoords, cumulative, lodgings, offRouteThreshold),
    {
      name: 'Destination',
      coords: routeCoords[routeCoords.length - 1],
      routeDistance: totalDistance,
      offRoute: 0,
      type: 'destination',
    },
  ].sort((a, b) => a.routeDistance - b.routeDistance);

  const n = candidates.length;
  if (n <= 1) return candidates;

  const dp = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  dp[0] = 0;

  for (let i = 0; i < n; i++) {
    if (dp[i] === Infinity) continue;
    for (let j = i + 1; j < n; j++) {
      const segment = candidates[j].routeDistance - candidates[i].routeDistance;
      if (segment <= 0) continue;
      const cost = dp[i]
        + distanceDeviationWeight * Math.abs(segment - targetMeters)
        + offRouteDeviationWeight * candidates[j].offRoute;
      if (cost < dp[j]) { dp[j] = cost; prev[j] = i; }
    }
  }

  if (dp[n - 1] === Infinity) {
    console.warn('Destination unreachable in itinerary DP.');
    return [candidates[0], candidates[n - 1]];
  }

  const itinerary = [];
  for (let i = n - 1; i !== -1; i = prev[i]) {
    itinerary.push(candidates[i]);
    if (itinerary.length > n) {
      console.error('Itinerary reconstruction overflow.');
      return [candidates[0], candidates[n - 1]];
    }
  }
  return itinerary.reverse();
}

export function useItineraryPlanner() {
  const [isPlanning, setIsPlanning] = useState(false);
  const [error, setError] = useState(null);

  const planRouteItinerary = useCallback(async (route, targetDailyKm, weights) => {
    setIsPlanning(true);
    setError(null);
    try {
      return await calculateOptimalItinerary(route, targetDailyKm, weights);
    } catch (err) {
      console.error('Itinerary planning failed:', err);
      setError(err.message || 'Failed to plan itinerary');
      return null;
    } finally {
      setIsPlanning(false);
    }
  }, []);

  return { planRouteItinerary, isPlanning, error };
}
