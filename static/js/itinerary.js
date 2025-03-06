// itinerary.js
// =============================
// Extracted itinerary logic for dynamic programming and for
// displaying itinerary stops (markers, sidebar, etc.).
// =============================

import { getLodgingList, getDistance } from './nearbySleep.js';
import { getMap } from './map.js';

/**
 * Compute cumulative distances along the route.
 * @param {Array} coordinates - Array of [lng, lat] points.
 * @returns {Array} Cumulative distances in meters.
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
 * @param {Array} coordinates - Route coordinates.
 * @param {Array} cumDist - Cumulative distances along the route.
 * @param {Array} lodgingList - List of lodging objects {name, coords}.
 * @param {number} threshold - Max allowed off-route distance (meters).
 * @returns {Array} Candidate stops.
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
 * Use dynamic programming to plan the itinerary.
 * @param {Object} route - The route object (e.g. data.paths[0]).
 * @param {number} targetDailyDistanceKm - Target daily distance in km.
 * @returns {Array} Optimal itinerary array of stops.
 */
function planItinerary(route, targetDailyDistanceKm) {
  const coordinates = route.points.coordinates;
  const cumDist = computeCumulativeDistances(coordinates);
  const totalRouteDistance = cumDist[cumDist.length - 1];

  const lodgingList = getLodgingList();
  const lodgingCandidates = projectLodgingsOntoRoute(coordinates, cumDist, lodgingList, 2500);

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

  // ---- ADJUST THESE WEIGHTS AS YOU LIKE ----
  const distanceDeviationWeight = 5;   // Lower means distance deviation is less important
  const offRouteDeviationWeight = .02;   // Higher means off-route deviation is more important
  // ------------------------------------------

  for (let i = 0; i < n; i++) {
    if (dp[i] === Infinity) continue;

    for (let j = i + 1; j < n; j++) {
      if (lodgingCandidates[j].routeDistance <= lodgingCandidates[i].routeDistance) continue;

      const segmentDistance = lodgingCandidates[j].routeDistance - lodgingCandidates[i].routeDistance;
      // Optionally skip very long segments (e.g., > 1.5× daily target)
      // if (segmentDistance > targetMeters * 1.5) continue;

      // Weighted cost function
      const distanceDeviation = Math.abs(segmentDistance - targetMeters);
      const offRoutePenalty = lodgingCandidates[j].offRoute;

      const costSegment = distanceDeviationWeight * distanceDeviation
                        + offRouteDeviationWeight * offRoutePenalty;

      const newCost = dp[i] + costSegment;
      if (newCost < dp[j]) {
        dp[j] = newCost;
        prev[j] = i;
      }
    }
  }

  // Reconstruct itinerary by backtracking from the last candidate
  // (which should be "Destination" after sorting).
  const itinerary = [];
  let index = n - 1;
  while (index !== -1) {
    itinerary.push(lodgingCandidates[index]);
    index = prev[index];
  }
  return itinerary.reverse();
}

/**
 * Plot itinerary stops on the map with markers.
 * Popup includes:
 *  - Label ("Start", "Destination", or lodging name)
 *  - Total distance along route (km)
 *  - Distance since last stop (km)
 *  - Off-route deviation (m)
 */
function plotItineraryMarkers(itinerary) {
  // Remove old markers if any
  if (window.itineraryMarkers) {
    window.itineraryMarkers.forEach(marker => marker.remove());
  }
  window.itineraryMarkers = [];

  const map = getMap();
  itinerary.forEach((stop, i) => {
    // Decide marker color
    let color;
    if (stop.type === 'start') color = 'black';
    else if (stop.type === 'destination') color = 'red';
    else if (stop.type === 'Hotel') color = 'blue';
    else color = 'green';

    // Calculate total distance so far and distance since last stop
    const cumulativeKm = (stop.routeDistance / 1000).toFixed(2);
    let deltaKm = 0;
    if (i > 0) {
      const prevStop = itinerary[i - 1];
      deltaKm = (stop.routeDistance - prevStop.routeDistance) / 1000;
    }

    // Decide title
    let title;
    if (stop.type === 'start') title = 'Start';
    else if (stop.type === 'destination') title = 'Destination';
    else title = stop.name; // Hotel / Shelter name

    const popupHTML = `
      <b>${title}</b><br/>
      Distance along route: ${cumulativeKm} km<br/>
      ${
        i === 0
          ? ''
          : `+${deltaKm.toFixed(2)} km from last stop<br/>`
      }
      Off-route deviation: ${stop.offRoute.toFixed(0)} m
    `;

    const marker = new mapboxgl.Marker({ color })
      .setLngLat(stop.coords)
      .setPopup(new mapboxgl.Popup().setHTML(popupHTML))
      .addTo(map);

    window.itineraryMarkers.push(marker);
  });
}

/**
 * Update the itinerary sidebar with the optimal stops.
 * For each stop (except the first), also display the km from the previous stop.
 */
function updateItinerarySidebar(itinerary) {
  const sidebar = document.getElementById('itinerarySidebar');
  sidebar.innerHTML = '<h3>Itinerary</h3>';

  for (let i = 0; i < itinerary.length; i++) {
    const stop = itinerary[i];
    const cumulativeKm = (stop.routeDistance / 1000).toFixed(2);
    let label, deltaKm = 0;

    if (i === 0) {
      // For the first stop, just label it based on its type.
      label = (stop.type === 'start') ? 'Start' : `Stop ${i}`;
    } else {
      if (stop.type === 'start') {
        label = 'Start';
      } else if (stop.type === 'destination') {
        label = 'Destination';
      } else {
        label = `Stop ${i}`;
      }
      // Now it's safe to access itinerary[i-1]
      deltaKm = (stop.routeDistance - itinerary[i - 1].routeDistance) / 1000;
    }

    const deltaStr = deltaKm.toFixed(2);
    const detourStr = stop.offRoute.toFixed(0);
    let description;

    if (stop.type === 'start') {
      description = `<strong>${label}:</strong> ${stop.name} — ${cumulativeKm} km along route`;
    } else if (stop.type === 'destination') {
      description = `<strong>${label}:</strong> ${stop.name} — ${cumulativeKm} km along route, +${deltaStr} km from last stop`;
    } else {
      description = `<strong>${label}:</strong> ${stop.name} — ${cumulativeKm} km along route, +${deltaStr} km from last stop, detour ${detourStr} m`;
    }

    const div = document.createElement('div');
    div.classList.add('itinerary-stop');
    div.innerHTML = description;
    sidebar.appendChild(div);
  }
}


export { planItinerary, plotItineraryMarkers, updateItinerarySidebar };
