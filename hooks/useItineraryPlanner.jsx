// hooks/useItineraryPlanner.js
import { useState, useCallback } from 'react';

// --- Constants ---
const HOTELS_URL = 'https://geojson-data-bikerouteplanner.s3.eu-north-1.amazonaws.com/denmark_hotels.geojson';
const SHELTERS_URL = 'https://geojson-data-bikerouteplanner.s3.eu-north-1.amazonaws.com/denmark_shelters.geojson';
const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_OFF_ROUTE_THRESHOLD_METERS = 2500; // Max distance (m) a lodging can be from route

// --- Helper: Haversine Distance ---
function getDistance(coord1, coord2) {
    if (!coord1 || !coord2) return Infinity;
    const lat1 = (coord1[1] * Math.PI) / 180;
    const lat2 = (coord2[1] * Math.PI) / 180;
    const deltaLat = lat2 - lat1;
    const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;
    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
}

// --- Helper: Compute Cumulative Distances ---
function computeCumulativeDistances(coordinates) {
  if (!coordinates || coordinates.length === 0) return [0];
  const cumDist = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const d = getDistance(coordinates[i - 1], coordinates[i]);
    cumDist.push(cumDist[i - 1] + d);
  }
  return cumDist;
}

// --- Helper: Fetch and Process Lodging Data ---
async function fetchAndProcessLodgingData() {
    try {
        const [hotelResponse, shelterResponse] = await Promise.all([
            fetch(HOTELS_URL),
            fetch(SHELTERS_URL)
        ]);

        if (!hotelResponse.ok || !shelterResponse.ok) {
            console.error("Failed to fetch lodging data:", hotelResponse.statusText, shelterResponse.statusText);
            return []; // Return empty on fetch error
        }

        const [hotelData, shelterData] = await Promise.all([
             hotelResponse.json(),
             shelterResponse.json()
        ]);

        const hotels = hotelData.features.map(f => ({
            name: f.properties.name || "Unknown Hotel",
            coords: f.geometry.coordinates,
            type: 'Hotel' // Add type for easier identification
        })).filter(h => h.coords); // Filter out invalid entries

        const shelters = shelterData.features.map(f => ({
            name: f.properties.name || "Unknown Shelter",
            coords: f.geometry.coordinates,
            type: 'Shelter' // Add type
        })).filter(s => s.coords); // Filter out invalid entries

        console.log("Fetched Hotels & Shelters:", hotels.length, shelters.length);
        return [...hotels, ...shelters];

    } catch (error) {
        console.error("Error loading or processing sleeping locations:", error);
        return []; // Return empty on processing error
    }
}


// --- Helper: Project Lodgings onto Route ---
function projectLodgingsOntoRoute(routeCoordinates, routeCumDist, lodgingList, threshold = DEFAULT_OFF_ROUTE_THRESHOLD_METERS) {
  if (!routeCoordinates || routeCoordinates.length === 0 || !lodgingList || lodgingList.length === 0) {
      return [];
  }

  return lodgingList
    .map(lodging => {
      let minDist = Infinity;
      let bestIndex = -1; // Use -1 to indicate not found initially

      // Find the nearest point on the route to the lodging
      for (let i = 0; i < routeCoordinates.length; i++) {
        const d = getDistance(routeCoordinates[i], lodging.coords);
        if (d < minDist) {
          minDist = d;
          bestIndex = i;
        }
      }

      // Only include if within threshold and a nearest point was found
      return (bestIndex !== -1 && minDist <= threshold)
        ? {
            name: lodging.name,
            coords: lodging.coords,
            // Use distance from cumulative array, handle potential index out of bounds
            routeDistance: routeCumDist[Math.min(bestIndex, routeCumDist.length - 1)] || 0,
            offRoute: minDist,
            type: lodging.type, // Use pre-assigned type
          }
        : null;
    })
    .filter(Boolean); // Remove null entries
}

// --- Main Itinerary Planning Function ---
async function calculateOptimalItinerary(route, targetDailyDistanceKm, weights) {
    if (!route || !route.points?.coordinates || route.points.coordinates.length < 2) {
        console.warn("Invalid route data for itinerary planning.");
        return null; // Cannot plan without a valid route
    }

    const {
        distanceDeviationWeight = 5,   // Default weights
        offRouteDeviationWeight = 0.02
    } = weights || {}; // Allow overriding weights

    const routeCoordinates = route.points.coordinates;
    const routeCumDist = computeCumulativeDistances(routeCoordinates);
    const totalRouteDistance = routeCumDist[routeCumDist.length - 1];
    const targetMeters = targetDailyDistanceKm * 1000;

    // Fetch lodging data *when planning starts*
    const lodgingList = await fetchAndProcessLodgingData();
    if (lodgingList.length === 0) {
        console.warn("No lodging data available for itinerary planning.");
        // Optionally proceed without lodging if desired, or return null
        // return null;
    }

    // Project onto route
    const lodgingCandidates = projectLodgingsOntoRoute(routeCoordinates, routeCumDist, lodgingList);

    // Add Start and End points definitively
    const allCandidates = [
        { name: "Start", coords: routeCoordinates[0], routeDistance: 0, offRoute: 0, type: "start" },
        ...lodgingCandidates, // Add projected lodgings
        { name: "Destination", coords: routeCoordinates[routeCoordinates.length - 1], routeDistance: totalRouteDistance, offRoute: 0, type: "destination" }
    ];

    // Sort all candidates by their distance along the route
    allCandidates.sort((a, b) => a.routeDistance - b.routeDistance);

    // --- Dynamic Programming ---
    const n = allCandidates.length;
    if (n <= 1) return allCandidates; // Handle edge case of only start/end

    const dp = new Array(n).fill(Infinity); // dp[i] = min cost to reach candidate i
    const prev = new Array(n).fill(-1);      // prev[i] = index of previous candidate in optimal path to i

    const startIndex = 0; // Start is always the first after sorting
    dp[startIndex] = 0;   // Cost to reach start is 0

    for (let i = 0; i < n; i++) {
        // If we can't reach candidate i with finite cost, skip it
        if (dp[i] === Infinity) continue;

        // Consider candidate j as the *next* potential stop after i
        for (let j = i + 1; j < n; j++) {
            // Calculate distance of the segment between stops i and j ALONG the route
            const segmentDistance = allCandidates[j].routeDistance - allCandidates[i].routeDistance;

            // Skip if segment distance is zero or negative (shouldn't happen with sorting, but safety check)
            if (segmentDistance <= 0) continue;

            // Calculate cost for this specific segment (i to j)
            const distanceDeviation = Math.abs(segmentDistance - targetMeters);
            const offRoutePenalty = allCandidates[j].offRoute; // Penalty for how far stop j is from route

            const costSegment = distanceDeviationWeight * distanceDeviation
                              + offRouteDeviationWeight * offRoutePenalty;

            // Calculate the total cost to reach stop j via stop i
            const newCost = dp[i] + costSegment;

            // If this path (via i) is cheaper than any previous path found to j
            if (newCost < dp[j]) {
                dp[j] = newCost; // Update minimum cost to reach j
                prev[j] = i;     // Record that i is the best previous stop to reach j
            }
        }
    }

    // --- Reconstruct the Itinerary ---
    const itinerary = [];
    let currentIndex = n - 1; // Start backtracking from the destination (last element after sort)

    // Check if destination is reachable
    if (dp[currentIndex] === Infinity) {
        console.warn("Destination seems unreachable in DP calculation.");
        // Fallback: return just start and end? Or the original route?
        // Returning start/end is safer for now.
        return [allCandidates[0], allCandidates[n - 1]];
    }

    while (currentIndex !== -1) {
        itinerary.push(allCandidates[currentIndex]);
        currentIndex = prev[currentIndex]; // Move to the previous stop in the optimal path
        if (itinerary.length > n) { // Safety break for infinite loops
            console.error("Itinerary reconstruction exceeded candidate count, breaking.");
            return [allCandidates[0], allCandidates[n - 1]]; // Fallback
        }
    }

    return itinerary.reverse(); // Reverse to get order from Start to Destination
}


// --- Custom Hook Export ---
// Wraps the async planning logic
export function useItineraryPlanner() {
    const [isPlanning, setIsPlanning] = useState(false);
    const [error, setError] = useState(null);

    const planRouteItinerary = useCallback(async (route, targetDailyDistanceKm, weights) => {
        setIsPlanning(true);
        setError(null);
        try {
            const itinerary = await calculateOptimalItinerary(route, targetDailyDistanceKm, weights);
            setIsPlanning(false);
            return itinerary;
        } catch (err) {
            console.error("Error during itinerary planning:", err);
            setError(err.message || "Failed to plan itinerary");
            setIsPlanning(false);
            return null;
        }
    }, []); // useCallback ensures function reference is stable

    return { planRouteItinerary, isPlanning, error };
}