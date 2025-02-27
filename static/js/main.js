// Initialize Mapbox
mapboxgl.accessToken = mapboxToken;
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [12.5700724, 55.6867243],
  zoom: 12
});
map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

// Create Geocoder Instances
var startGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  placeholder: "Start location"
});
var endGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  placeholder: "Destination"
});

// Append Geocoders to Sidebar Containers
document.getElementById('startGeocoder').appendChild(startGeocoder.onAdd(map));
document.getElementById('endGeocoder').appendChild(endGeocoder.onAdd(map));

var startCoords, endCoords;
startGeocoder.on('result', function(e) {
  startCoords = e.result.center;
});
endGeocoder.on('result', function(e) {
  endCoords = e.result.center;
});

// Open Sidebar with Burger Icon
document.getElementById('burgerIcon').addEventListener('click', function() {
  document.getElementById('sidebar').classList.add('open');
  // Hide the burger icon when sidebar is open
  this.style.display = 'none';
});

// Close Sidebar with Red Cross Button
document.getElementById('closeBtn').addEventListener('click', function() {
  document.getElementById('sidebar').classList.remove('open');
  // Show the burger icon again when sidebar closes
  document.getElementById('burgerIcon').style.display = 'block';
}); 

// Global state for hotels layer
var hotelsLayerVisible = false;
var lastSearchedBounds = null;

// Helper function to compare bounds (with a small tolerance)
function boundsDifferent(bounds1, bounds2) {
  var tolerance = 0.0001; // adjust as needed
  return (Math.abs(bounds1.getNorth() - bounds2.getNorth()) > tolerance ||
          Math.abs(bounds1.getSouth() - bounds2.getSouth()) > tolerance ||
          Math.abs(bounds1.getEast() - bounds2.getEast()) > tolerance ||
          Math.abs(bounds1.getWest() - bounds2.getWest()) > tolerance);
}

// "Show Hotels" button toggles the hotels layer on/off.
document.getElementById('showHotels').addEventListener('click', function() {
  if (!hotelsLayerVisible) {
    // Get current bounds and build a bounding polygon
    var currentBounds = map.getBounds();
    var bboxPolygon = {
      type: 'Polygon',
      coordinates: [[
        [currentBounds.getWest(), currentBounds.getSouth()],
        [currentBounds.getEast(), currentBounds.getSouth()],
        [currentBounds.getEast(), currentBounds.getNorth()],
        [currentBounds.getWest(), currentBounds.getNorth()],
        [currentBounds.getWest(), currentBounds.getSouth()]
      ]]
    };

    // Add the hotels vector source and layer (using your tileset)
    map.addSource('denmark_hotels', {
      type: 'vector',
      url: 'mapbox://madshogenhaug.3hen1icg'
    });
    map.addLayer({
      id: 'denmark_hotels_layer',
      type: 'circle',
      source: 'denmark_hotels',
      'source-layer': 'denmark_hotels-a888kw', // Adjust if your source layer name is different
      paint: {
        'circle-radius': 6,
        'circle-color': '#FF0000'
      },
      filter: ['within', bboxPolygon]  // show only hotels within current bounds
    });
    hotelsLayerVisible = true;
    lastSearchedBounds = currentBounds;
    this.textContent = 'Hide Hotels';
  } else {
    // Remove hotels layer and source
    if (map.getLayer('denmark_hotels_layer')) {
      map.removeLayer('denmark_hotels_layer');
    }
    if (map.getSource('denmark_hotels')) {
      map.removeSource('denmark_hotels');
    }
    hotelsLayerVisible = false;
    lastSearchedBounds = null;
    this.textContent = 'Show Hotels';
    // Hide the "Search This Area" button
    document.getElementById('searchThisArea').style.display = 'none';
  }
});

// Listen for moveend events only if hotels are visible to decide if we should prompt "Search This Area"
map.on('moveend', function() {
  if (hotelsLayerVisible) {
    var currentBounds = map.getBounds();
    // If the new bounds differ from the last searched bounds, show the "Search This Area" button.
    if (!lastSearchedBounds || boundsDifferent(lastSearchedBounds, currentBounds)) {
      document.getElementById('searchThisArea').style.display = 'block';
    } else {
      document.getElementById('searchThisArea').style.display = 'none';
    }
  }
});

document.getElementById('searchThisArea').addEventListener('click', function() {
  // Check if the user is zoomed in enough
  var currentZoom = map.getZoom();
  var minZoomThreshold = 9; // Adjust this value as needed
  if (currentZoom < minZoomThreshold) {
    alert("You're zoomed out too far. Please zoom in further to search this area.");
    return;
  }
  
  // Proceed if zoom level is acceptable
  var currentBounds = map.getBounds();
  var bboxPolygon = {
    type: 'Polygon',
    coordinates: [[
      [currentBounds.getWest(), currentBounds.getSouth()],
      [currentBounds.getEast(), currentBounds.getSouth()],
      [currentBounds.getEast(), currentBounds.getNorth()],
      [currentBounds.getWest(), currentBounds.getNorth()],
      [currentBounds.getWest(), currentBounds.getSouth()]
    ]]
  };
  map.setFilter('denmark_hotels_layer', ['within', bboxPolygon]);
  lastSearchedBounds = currentBounds;
  this.style.display = 'none';
});


// Draw Route on Map (unchanged)
function drawRouteOnMap(route) {
  if (map.getSource('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }
  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: route.geometry
    }
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
  // Adjust map view to the route
  var coordinates = route.geometry.coordinates;
  var bounds = coordinates.reduce(function(bounds, coord) {
    return bounds.extend(coord);
  }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
  map.fitBounds(bounds, { padding: 20 });
}

// Fetch Route on Button Click (unchanged)
document.getElementById('getRoute').addEventListener('click', function() {
  if (!startCoords || !endCoords) {
    alert("Please select both start and end locations.");
    return;
  }

  // Build an array for exclusions based on checkbox values
  let exclusions = [];
  if (document.getElementById('excludeFerry').checked) {
    exclusions.push("ferry");
  }

  // Prepare the request body including the exclusions
  var requestBody = {
    start: startCoords,
    end: endCoords,
    exclude: exclusions
  };

  fetch('/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("HTTP error " + response.status);
    }
    return response.json();
  })
  .then(data => {
    if (data.error) {
      alert("Error: " + data.error);
      return;
    }
    var routes = data.routes;
    if (!routes || routes.length === 0) {
      alert("No routes found.");
      return;
    }
    drawRouteOnMap(routes[0]);
  })
  .catch(error => {
    console.error("Error fetching route:", error);
    alert("Failed to fetch route. See console for details.");
  });
});
