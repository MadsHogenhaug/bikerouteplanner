// itinerary.js
// --------------------------------------------------
// Hybrid itinerary planner: combines global (DP) optimization
// with a day-by-day alternative lookup.
// Exports:
//   planHybridItinerary(route, targetDailyDistanceKm)
//   plotHybridPlan(dayPlan)
//   updateHybridSidebar(dayPlan)
// --------------------------------------------------

import { getLodgingList, getDistance } from './nearbySleep.js';
import { getMap } from './map.js';

/**
 * Compute cumulative distances along the route.
 * @param {Array} coordinates - Array of [lng, lat] points.
 * @returns {Array<number>} Cumulative distances in meters.
 */
function computeCumulativeDistances(coordinates) {
  const cumDist = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const d = getDistance(coordinates[i - 1], coordinates[i]);
    cumDist.push(cumDist[i - 1] + d);
  }
  return cumDist;
}

/**
 * Project lodging locations onto the route.
 * Each lodging is assigned a routeDistance (meters along route)
 * and an offRoute value (distance in meters from the route).
 * @param {Array} coordinates - Route coordinates.
 * @param {Array<number>} cumDist - Cumulative distances along the route.
 * @param {Array} lodgingList - List of lodging objects {name, coords}.
 * @param {number} threshold - Maximum allowed off-route distance (meters).
 * @returns {Array} Candidate lodging stops.
 */
function projectLodgingsOntoRoute(coordinates, cumDist, lodgingList, threshold = 1000) {
  return lodgingList
    .map(lodging => {
      let minDist = Infinity;
      let bestIndex = 0;
      for (let i = 0; i < coordinates.length; i++) {
        const d = getDistance(coordinates[i], lodging.coords);
        if (d < minDist) {
          minDist = d;
          bestIndex = i;
        }
      }
      return minDist <= threshold
        ? {
            name: lodging.name,
            coords: lodging.coords,
            routeDistance: cumDist[bestIndex],
            offRoute: minDist,
            type: lodging.name.includes('Hotel') ? 'Hotel' : 'Shelter',
          }
        : null;
    })
    .filter(Boolean);
}

/**
 * Plan the primary itinerary using a dynamic programming approach.
 * This globally optimizes the stops by minimizing a weighted cost function
 * that penalizes deviations from the target daily distance and off-route detours.
 * @param {Object} route - The route object (e.g. data.paths[0]).
 * @param {number} targetDailyDistanceKm - Target daily distance in kilometers.
 * @returns {Object} Object containing:
 *   - itinerary: Array of selected stops (including Start and Destination).
 *   - lodgingCandidates: All lodging candidates (for alternative lookup).
 */
function planItineraryDP(route, targetDailyDistanceKm) {
  const coordinates = route.points.coordinates;
  const cumDist = computeCumulativeDistances(coordinates);
  const totalRouteDistance = cumDist[cumDist.length - 1];

  const lodgingList = getLodgingList();
  let lodgingCandidates = projectLodgingsOntoRoute(coordinates, cumDist, lodgingList, 2500);

  // Add Start and Destination markers.
  lodgingCandidates.push({
    name: "Start",
    coords: coordinates[0],
    routeDistance: 0,
    offRoute: 0,
    type: "start"
  });
  lodgingCandidates.push({
    name: "Destination",
    coords: coordinates[coordinates.length - 1],
    routeDistance: totalRouteDistance,
    offRoute: 0,
    type: "destination"
  });

  lodgingCandidates.sort((a, b) => a.routeDistance - b.routeDistance);

  const n = lodgingCandidates.length;
  const dp = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);

  const startIndex = lodgingCandidates.findIndex(c => c.type === "start");
  const destIndex = lodgingCandidates.findIndex(c => c.type === "destination");
  dp[startIndex] = 0;

  const targetMeters = targetDailyDistanceKm * 1000;
  // ---- COST WEIGHTS (adjust as desired) ----
  const distanceDeviationWeight = 5;   // penalizes deviation from daily target
  const offRouteDeviationWeight = 0.02;  // penalizes off-route distance
  // ---------------------------------------------

  // Dynamic programming: for each candidate, try to extend the route.
  for (let i = 0; i < n; i++) {
    if (dp[i] === Infinity) continue;
    for (let j = i + 1; j < n; j++) {
      if (lodgingCandidates[j].routeDistance <= lodgingCandidates[i].routeDistance) continue;

      const segmentDistance = lodgingCandidates[j].routeDistance - lodgingCandidates[i].routeDistance;
      const distanceDeviation = Math.abs(segmentDistance - targetMeters);
      const offRoutePenalty = lodgingCandidates[j].offRoute;
      const costSegment = distanceDeviationWeight * distanceDeviation +
                          offRouteDeviationWeight * offRoutePenalty;
      const newCost = dp[i] + costSegment;
      if (newCost < dp[j]) {
        dp[j] = newCost;
        prev[j] = i;
      }
    }
  }

  // Backtrack from Destination to reconstruct the optimal itinerary.
  const itinerary = [];
  let index = destIndex;
  while (index !== -1) {
    itinerary.push(lodgingCandidates[index]);
    index = prev[index];
  }
  itinerary.reverse();
  return { itinerary, lodgingCandidates };
}

/**
 * Given a primary stop, find nearby alternative lodging stops.
 * Excludes the Start and Destination and the primary stop itself.
 * @param {Object} primaryStop - The chosen lodging stop.
 * @param {Array} lodgingCandidates - All lodging candidates.
 * @param {number} count - Number of alternatives to return.
 * @returns {Array} Array of alternative lodging stops.
 */
function findNearestAlternatives(primaryStop, lodgingCandidates, count = 4) {
  const alternatives = lodgingCandidates.filter(c =>
    c !== primaryStop &&
    c.type !== "start" &&
    c.type !== "Destination" // exclude the Destination from alternatives
  );
  alternatives.sort((a, b) =>
    Math.abs(a.routeDistance - primaryStop.routeDistance) -
    Math.abs(b.routeDistance - primaryStop.routeDistance)
  );
  return alternatives.slice(0, count);
}
/**
 * Plan a hybrid day-by-day itinerary.
 * First, the global DP algorithm selects primary stops.
 * Then, for each day segment, nearby alternative stops are added.
 * @param {Object} route - The route object.
 * @param {number} targetDailyDistanceKm - Target daily distance (km).
 * @returns {Array} Array of day objects, each containing:
 *   - dayIndex: number,
 *   - bestStop: the primary lodging stop,
 *   - alternatives: array of alternative lodging stops,
 *   - startDistance: routeDistance of day start,
 *   - endDistance: routeDistance of bestStop.
 */
export function planHybridItinerary(route, targetDailyDistanceKm) {
  const { itinerary, lodgingCandidates } = planItineraryDP(route, targetDailyDistanceKm);
  const dayPlan = [];

  // Use the DP itinerary stops as day boundaries.
  // (Itinerary[0] is Start; subsequent stops are day endpoints.)
  for (let i = 0; i < itinerary.length - 1; i++) {
    const dayIndex = i + 1;
    // Use the next stop as the day's "best" lodging.
    const bestStop = itinerary[i + 1];
    const alternatives = findNearestAlternatives(bestStop, lodgingCandidates, 4);
    dayPlan.push({
      dayIndex,
      bestStop,
      alternatives,
      startDistance: itinerary[i].routeDistance,
      endDistance: bestStop.routeDistance
    });
  }
  return dayPlan;
}

/**
 * Plot the hybrid itinerary on the map.
 * Marks each day's best stop (in red) and its alternative options (in blue).
 * @param {Array} dayPlan - The day-by-day itinerary plan.
 */
export function plotHybridPlan(dayPlan) {
  // Clear any existing markers.
  if (window.itineraryMarkers) {
    window.itineraryMarkers.forEach(marker => marker.remove());
  }
  window.itineraryMarkers = [];
  const map = getMap();

  dayPlan.forEach(day => {
    // Marker for the primary (best) stop.
    const bestPopupHTML = `
      <b>Day ${day.dayIndex} - Best Stop</b><br/>
      ${day.bestStop.name}<br/>
      Route Distance: ${(day.bestStop.routeDistance / 1000).toFixed(2)} km
    `;
    const bestMarker = new mapboxgl.Marker({ color: 'red' })
      .setLngLat(day.bestStop.coords)
      .setPopup(new mapboxgl.Popup().setHTML(bestPopupHTML))
      .addTo(map);
    window.itineraryMarkers.push(bestMarker);

    // Markers for alternative stops.
    day.alternatives.forEach((alt, idx) => {
      const altPopupHTML = `
        <b>Day ${day.dayIndex} - Alternative ${idx + 1}</b><br/>
        ${alt.name}<br/>
        Route Distance: ${(alt.routeDistance / 1000).toFixed(2)} km
      `;
      const altMarker = new mapboxgl.Marker({ color: 'blue' })
        .setLngLat(alt.coords)
        .setPopup(new mapboxgl.Popup().setHTML(altPopupHTML))
        .addTo(map);
      window.itineraryMarkers.push(altMarker);
    });
  });
}

/**
 * Update the itinerary popup with the hybrid day-by-day plan.
 * Displays the best stop along with alternative stops for each day.
 * @param {Array} dayPlan - The day-by-day itinerary plan.
 */
export function updateHybridSidebar(dayPlan) {
  // We'll place the content in the itineraryContent container
  const itineraryContainer = document.getElementById('itineraryContent');
  if (!itineraryContainer) {
    console.error("Element with id 'itineraryContent' not found.");
    return;
  }
  itineraryContainer.innerHTML = '<h3>Hybrid Itinerary</h3>';

  dayPlan.forEach(day => {
    // Best stop
    const cumulativeKm = (day.bestStop.routeDistance / 1000).toFixed(2);
    const deltaKm = ((day.endDistance - day.startDistance) / 1000).toFixed(2);
    const detourStr = day.bestStop.offRoute.toFixed(0);

    let dayHTML = `
      <div class="itinerary-stop">
        <strong>Day ${day.dayIndex}:</strong> ${day.bestStop.name} &mdash;
        ${cumulativeKm} km along route,
        +${deltaKm} km from last stop,
        detour ${detourStr} m
      </div>
    `;

    // Show alternatives (already filtered so we don't see "destination")
    if (day.alternatives && day.alternatives.length > 0) {
      dayHTML += `<div class="alternative-lodgings" style="margin-left: 20px;">`;
      day.alternatives.forEach((alt, i) => {
        const altCumulativeKm = (alt.routeDistance / 1000).toFixed(2);
        const altDelta = ((alt.routeDistance - day.startDistance) / 1000).toFixed(2);
        const altDetour = alt.offRoute.toFixed(0);

        dayHTML += `
          <div class="itinerary-option">
            <strong>Alternative #${i + 1}:</strong> ${alt.name} &mdash;
            ${altCumulativeKm} km along route,
            +${altDelta} km from last stop,
            detour ${altDetour} m
          </div>
        `;
      });
      dayHTML += `</div>`;
    }

    itineraryContainer.innerHTML += dayHTML;
  });

  // Make sure the popup is visible.
  document.getElementById('itineraryPopup').style.display = 'block';
}


