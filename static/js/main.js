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

// Draw Route on Map
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

// Fetch Route on Button Click
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
