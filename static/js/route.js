// route.js – Updated for dynamic programming itinerary planning with revised itinerary display

import { loadSleepingLocations, getLodgingList, getDistance } from './nearbySleep.js';
import { getMap } from './map.js';
import { getStartCoords, getEndCoords } from './geocoder.js';

loadSleepingLocations();

export function drawRouteOnMap(route) {
  const map = getMap();
  
  // Remove any existing route
  if (map.getSource('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }
  
  map.addSource('route', {
    type: 'geojson',
    data: route.points
  });
  
  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#1DB954',
      'line-width': 8
    }
  });
  
  const coordinates = route.points.coordinates;
  const bounds = coordinates.reduce((bounds, coord) => bounds.extend(coord),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
  );
  map.fitBounds(bounds, { padding: 20 });
}

export function initRouteFetcher() {
  const map = getMap();

  document.getElementById('getRoute').addEventListener('click', function () {
    const startCoords = getStartCoords();
    const endCoords = getEndCoords();
    if (!startCoords || !endCoords) {
      alert("Please select both start and end locations.");
      return;
    }

    // Retrieve user input for daily distance (in km)
    const dailyDistance = parseFloat(document.getElementById('dailyDistance').value);
    if (isNaN(dailyDistance) || dailyDistance <= 0) {
      alert("Please enter a valid daily biking distance.");
      return;
    }

    const maxSpeed = parseFloat(document.getElementById('maxSpeed').value);
    const Tertiary = document.getElementById('Tertiary').value;
    const Secondary = document.getElementById('Secondary').value;
    const Primary = document.getElementById('Primary').value;
    const BikeNetwork = document.getElementById('BikeNetwork').value;
    const Surface = document.getElementById('Surface').value;

    const customModel = {
      priority: [
        { "if": "road_class == TERTIARY", "multiply_by": Tertiary },
        { "if": "road_class == SECONDARY", "multiply_by": Secondary },
        { "if": "road_class == PRIMARY", "multiply_by": Primary },
        { "if": "bike_network == MISSING", "multiply_by": BikeNetwork },
        { "if": "surface == GRAVEL", "multiply_by": Surface }
      ]
    };

    const requestBody = {
      start: startCoords,
      end: endCoords,
      max_speed: maxSpeed,
      custom_model: customModel
    };

    fetch('/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert("Error: " + data.error);
          return;
        }

        const route = data.paths[0];
        drawRouteOnMap(route);

        // Use dynamic programming to plan the itinerary
        const itinerary = planItinerary(route, dailyDistance);
        plotItineraryMarkers(itinerary);
        updateItinerarySidebar(itinerary);
      })
      .catch(error => {
        console.error("Error fetching route:", error);
        alert("Failed to fetch route. See console for details.");
      });
  });
}

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
 * For each lodging, find the closest point on the route and record its cumulative distance and off-route deviation.
 * @param {Array} coordinates - Route coordinates.
 * @param {Array} cumDist - Cumulative distances along the route.
 * @param {Array} lodgingList - List of lodging objects {name, coords}.
 * @param {number} threshold - Maximum allowed off-route distance (meters) to consider.
 * @returns {Array} Candidate stops.
 */
function projectLodgingsOntoRoute(coordinates, cumDist, lodgingList, threshold = 1000) {
  const candidates = [];
  lodgingList.forEach(lodging => {
    let minDist = Infinity;
    let bestIndex = 0;
    for (let i = 0; i < coordinates.length; i++) {
      const d = getDistance(coordinates[i], lodging.coords);
      if (d < minDist) {
        minDist = d;
        bestIndex = i;
      }
    }
    if (minDist <= threshold) {
      candidates.push({
        name: lodging.name,
        coords: lodging.coords,
        routeDistance: cumDist[bestIndex],
        offRoute: minDist,
        type: lodging.name.includes("Hotel") ? "Hotel" : "Shelter"
      });
    }
  });
  return candidates;
}

/**
 * Use dynamic programming to plan the itinerary.
 * Start and destination are fixed stops.
 * Intermediate stops are chosen to minimize the penalty from deviating from the target daily distance plus off-route detours.
 * @param {Object} route - Route object (with route.points.coordinates).
 * @param {number} targetDailyDistanceKm - Target daily distance (km).
 * @returns {Array} Optimal itinerary (ordered stops).
 */
function planItinerary(route, targetDailyDistanceKm) {
  const coordinates = route.points.coordinates;
  const cumDist = computeCumulativeDistances(coordinates);
  const totalRouteDistance = cumDist[cumDist.length - 1];

  const lodgingList = getLodgingList();
  const lodgingCandidates = projectLodgingsOntoRoute(coordinates, cumDist, lodgingList, 5000);

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
  const distanceDeviationWeight = 1;   // Lower means distance deviation is less important
  const offRouteDeviationWeight = 1;   // Higher means off-route deviation is more important
  // ------------------------------------------

  for (let i = 0; i < n; i++) {
    if (dp[i] === Infinity) continue;

    for (let j = i + 1; j < n; j++) {
      if (lodgingCandidates[j].routeDistance <= lodgingCandidates[i].routeDistance) continue;

      const segmentDistance = lodgingCandidates[j].routeDistance - lodgingCandidates[i].routeDistance;
      // Optionally skip very long segments (e.g., > 1.5× daily target)
      if (segmentDistance > targetMeters * 1.5) continue;

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

  // Reconstruct path
  const itinerary = [];
  let index = destIndex;
  while (index !== -1) {
    itinerary.push(lodgingCandidates[index]);
    index = prev[index];
  }
  itinerary.reverse();
  return itinerary;
}


/**
 * Plot itinerary stops on the map with markers.
 * Popup includes:
 *  - Label ("Start", "Destination", or lodging name)
 *  - Total distance along route (km)
 *  - Distance since last stop (km)
 *  - Off-route deviation (m)
 * @param {Array} itinerary - List of stops from planItinerary.
 */
function plotItineraryMarkers(itinerary) {
  // Remove old markers
  if (window.itineraryMarkers) {
    window.itineraryMarkers.forEach(marker => marker.remove());
  }
  window.itineraryMarkers = [];

  itinerary.forEach((stop, i) => {
    // Decide marker color
    let color;
    if (stop.type === "start") {
      color = "black";
    } else if (stop.type === "destination") {
      color = "red";
    } else if (stop.type === "Hotel") {
      color = "blue";
    } else {
      color = "green";
    }

    // Calculate total distance so far and distance since last stop
    const cumulativeKm = (stop.routeDistance / 1000).toFixed(2);
    let deltaKm = 0;
    if (i > 0) {
      const prevStop = itinerary[i - 1];
      deltaKm = (stop.routeDistance - prevStop.routeDistance) / 1000;
    }

    // Decide what to show as the title
    let title;
    if (stop.type === "start") {
      title = "Start";
    } else if (stop.type === "destination") {
      title = "Destination";
    } else {
      title = stop.name; // For hotels/shelters
    }

    // Build the popup HTML
    // For the first stop, we omit the "+X km from last stop" line
    const popupHTML = `
      <b>${title}</b><br>
      Distance along route: ${cumulativeKm} km<br>
      ${i === 0 ? "" : `+${deltaKm.toFixed(2)} km from last stop<br>`}
      Off-route deviation: ${stop.offRoute.toFixed(0)} m
    `;

    // Create and add the marker
    const marker = new mapboxgl.Marker({ color })
      .setLngLat(stop.coords)
      .setPopup(new mapboxgl.Popup().setHTML(popupHTML))
      .addTo(getMap());

    window.itineraryMarkers.push(marker);
  });
}


/**
 * Update the itinerary sidebar with the optimal stops.
 * For each stop (except the first), also display the km driven since the previous stop.
 * Does not display "Stop 0" – instead, the first entry is labeled "Start" and the last "Destination."
 * @param {Array} itinerary - List of itinerary stops.
 */
function updateItinerarySidebar(itinerary) {
  const sidebar = document.getElementById("itinerarySidebar");
  sidebar.innerHTML = "<h3>Itinerary</h3>";
  
  for (let i = 0; i < itinerary.length; i++) {
    let label, deltaKm = 0;
    const cumulativeKm = (itinerary[i].routeDistance / 1000).toFixed(2);
    
    if (itinerary[i].type === "start") {
      label = "Start";
    } else if (itinerary[i].type === "destination") {
      label = "Destination";
      deltaKm = i === 0 ? 0 : ((itinerary[i].routeDistance - itinerary[i-1].routeDistance) / 1000);
    } else {
      label = `Stop ${i}`; // Since the start is labeled separately, intermediate stops will show Stop 1, Stop 2, etc.
      deltaKm = ((itinerary[i].routeDistance - itinerary[i-1].routeDistance) / 1000);
    }
    
    const deltaStr = deltaKm.toFixed(2);
    const detourStr = itinerary[i].offRoute.toFixed(0);
    
    let description;
    if (itinerary[i].type === "start") {
      description = `<strong>${label}:</strong> ${itinerary[i].name} — ${cumulativeKm} km along route`;
    } else if (itinerary[i].type === "destination") {
      description = `<strong>${label}:</strong> ${itinerary[i].name} — ${cumulativeKm} km along route, +${deltaStr} km from last stop`;
    } else {
      description = `<strong>${label}:</strong> ${itinerary[i].name} — ${cumulativeKm} km along route, +${deltaStr} km from last stop, detour ${detourStr} m`;
    }
    
    const div = document.createElement("div");
    div.classList.add("itinerary-stop");
    div.innerHTML = description;
    sidebar.appendChild(div);
  }
}

export { planItinerary };
