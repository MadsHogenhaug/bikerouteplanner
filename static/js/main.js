// Initialize Mapbox
mapboxgl.accessToken = mapboxToken;
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [12.5700724, 55.6867243],
  zoom: 15
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

// Global state for locations layer
var locationsLayerVisible = false;

document.getElementById('showHotels').addEventListener('click', function() {
  if (!locationsLayerVisible) {
    // Add the GeoJSON source for locations from your local file
    map.addSource("locations", {
      type: "geojson",
      data: "/static/data/denmark_hotels.geojson",
      cluster: true,
      clusterMaxZoom: 15
    });
    
    // Add the clustered layers
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "locations",
      filter: ["has", "point_count"],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          100,
          '#f1f075',
          750,
          '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          100,
          30,
          750,
          40
        ]
      }
    });

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'locations',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'locations',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    // Update button text to indicate that clicking again will hide the hotels
    this.textContent = "Hide Hotels";
    locationsLayerVisible = true;
  } else {
    // Remove the individual layers if they exist
    if (map.getLayer("clusters")) {
      map.removeLayer("clusters");
    }
    if (map.getLayer("cluster-count")) {
      map.removeLayer("cluster-count");
    }
    if (map.getLayer("unclustered-point")) {
      map.removeLayer("unclustered-point");
    }
    // Remove the source if it exists
    if (map.getSource("locations")) {
      map.removeSource("locations");
    }

    // Update button text to indicate that hotels can be shown again
    this.textContent = "Show Hotels";
    locationsLayerVisible = false;
  }
});

// Inspect a cluster on click
map.on('click', 'clusters', (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ['clusters']
  });
  const clusterId = features[0].properties.cluster_id;
  map.getSource('locations').getClusterExpansionZoom(
    clusterId,
    (err, zoom) => {
      if (err) return;

      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom: zoom
      });
    }
  );
});

// When a click event occurs on a feature in the unclustered-point layer,
// open a popup at the location of the feature, showing its name and website.
map.on('click', 'unclustered-point', (e) => {
  const coordinates = e.features[0].geometry.coordinates.slice();
  const name = e.features[0].properties.name;
  const website = e.features[0].properties.website;
  // Use a fallback for hotels without a website
  const websiteDisplay = website ? `<a href="${website}" target="_blank">${website}</a>` : "No website available";

  // Adjust coordinates if necessary for maps with multiple copies of features.
  if (['mercator', 'equirectangular'].includes(map.getProjection().name)) {
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }
  }

  new mapboxgl.Popup()
    .setLngLat(coordinates)
    .setHTML(
      `<strong>${name}</strong><br>${websiteDisplay}`
    )
    .addTo(map);
});

// Change the cursor to a pointer when hovering over clusters.
map.on('mouseenter', 'clusters', () => {
  map.getCanvas().style.cursor = 'pointer';
});
map.on('mouseleave', 'clusters', () => {
  map.getCanvas().style.cursor = '';
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
