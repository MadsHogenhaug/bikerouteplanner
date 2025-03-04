// Initialize Mapbox
mapboxgl.accessToken = mapboxToken;
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [12.5700724, 55.6867243],
  zoom: 10
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
    map.addSource("hotels", {
      type: "geojson",
      data: "/static/data/denmark_hotels.geojson",
      cluster: true,
      clusterMaxZoom: 15
    });
    
    // Add the clustered layers
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "hotels",
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
      source: 'hotels',
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
      source: 'hotels',
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
    if (map.getSource("hotels")) {
      map.removeSource("hotels");
    }

    // Update button text to indicate that hotels can be shown again
    this.textContent = "Show Hotels";
    locationsLayerVisible = false;
  }
});

// Global state for shelters layer visibility
var sheltersLayerVisible = false;

document.getElementById('showShelters').addEventListener('click', function() {
  if (!sheltersLayerVisible) {
    // Add the GeoJSON source for shelters
    map.addSource("shelters", {
      type: "geojson",
      data: "/static/data/denmark_shelters.geojson",
      cluster: true,
      clusterMaxZoom: 15
    });
    
    // Add clustered shelters layer
    map.addLayer({
      id: "shelter-clusters",
      type: "circle",
      source: "shelters",
      filter: ["has", "point_count"],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#FFA500', // Base color for clusters
          100,
          '#FFD700', // Mid-range clusters
          750,
          '#FF8C00'  // Larger clusters
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

    // Add cluster count labels for shelters
    map.addLayer({
      id: 'shelter-cluster-count',
      type: 'symbol',
      source: 'shelters',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    // Add unclustered shelter points layer
    map.addLayer({
      id: 'shelter-unclustered-point',
      type: 'circle',
      source: 'shelters',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#FF4500',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    // Update button text
    this.textContent = "Hide Shelters";
    sheltersLayerVisible = true;
  } else {
    // Remove the shelters layers if they exist
    if (map.getLayer("shelter-clusters")) {
      map.removeLayer("shelter-clusters");
    }
    if (map.getLayer("shelter-cluster-count")) {
      map.removeLayer("shelter-cluster-count");
    }
    if (map.getLayer("shelter-unclustered-point")) {
      map.removeLayer("shelter-unclustered-point");
    }
    // Remove the shelters source if it exists
    if (map.getSource("shelters")) {
      map.removeSource("shelters");
    }
    // Update button text
    this.textContent = "Show Shelters";
    sheltersLayerVisible = false;
  }
});

// Inspect a shelter cluster on click
map.on('click', 'shelter-clusters', (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ['shelter-clusters']
  });
  const clusterId = features[0].properties.cluster_id;
  map.getSource('shelters').getClusterExpansionZoom(
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

// Change cursor to pointer when hovering over shelter clusters
map.on('mouseenter', 'shelter-clusters', () => {
  map.getCanvas().style.cursor = 'pointer';
});
map.on('mouseleave', 'shelter-clusters', () => {
  map.getCanvas().style.cursor = '';
});

// Open a popup when clicking an unclustered shelter point
map.on('click', 'shelter-unclustered-point', (e) => {
  const coordinates = e.features[0].geometry.coordinates.slice();
  const name = e.features[0].properties.name;
  const website = e.features[0].properties.website;
  const coords_lng = coordinates[0]; // Longitude
  const coords_lat = coordinates[1]; // Latitude
  const websiteDisplay = website ? `<a href="${website}" target="_blank">${website}</a>` : "No website available";

  // Adjust coordinates for maps with multiple copies of features.
  if (['mercator', 'equirectangular'].includes(map.getProjection().name)) {
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }
  }

  new mapboxgl.Popup()
    .setLngLat(coordinates)
    .setHTML(`
      <strong>${name}</strong><br>
      ${websiteDisplay}<br>
      <a href="#" onclick="setDestination([${coords_lng}, ${coords_lat}]); return false;">Set as Destination</a>
    `)
    .addTo(map);
});

// Function to update the destination in the sidepanel's route planner
function setDestination(coords) {
  // Store the destination coordinates for later use in routing
  endCoords = coords;
  
  // Update the destination geocoder input with the coordinates.
  // Here, we convert the coordinates to a string, e.g., "55.68672, 12.57007"
  // Adjust the order if needed (lat, lng vs. lng, lat) depending on your preference.
  endGeocoder.setInput(`${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`);
}





// Inspect a cluster on click
map.on('click', 'clusters', (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ['clusters']
  });
  const clusterId = features[0].properties.cluster_id;
  map.getSource('hotels').getClusterExpansionZoom(
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



function drawRouteOnMap(route) {
  // Draw Route on Map
  if (map.getSource('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }
  // Use route.points (which should be a valid GeoJSON object)
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
  // Adjust map view to the route
  var coordinates = route.points.coordinates;
  var bounds = coordinates.reduce(function(bounds, coord) {
    return bounds.extend(coord);
  }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
  map.fitBounds(bounds, { padding: 20 });
}


// Toggle visibility of "Route Options" section
document.getElementById("routeOptionsToggle").addEventListener("click", function () {
  let content = document.getElementById("routeOptionsContent");
  let arrow = document.getElementById("routeOptionsArrow");
  
  content.classList.toggle("hidden");
  arrow.classList.toggle("open"); // Rotate arrow when expanded
});

// Toggle visibility of Other Options section
document.getElementById("additionalOptionsToggle").addEventListener("click", function () {
  let content = document.getElementById("additionalOptionsContent");
  let arrow = document.getElementById("additionalOptionsArrow");

  content.classList.toggle("hidden"); // Show/hide content
  arrow.classList.toggle("open"); // Rotate arrow when expanded
});

// Fetch Route on Button Click (unchanged)
document.getElementById('getRoute').addEventListener('click', function() {
  if (!startCoords || !endCoords) {
    alert("Please select both start and end locations.");
    return;
  }


  // Collect dynamic routing parameters from UI controls
  let maxSpeed = parseFloat(document.getElementById('maxSpeed').value);
  let Tertiary = document.getElementById('Tertiary').value;
  let Secondary = document.getElementById('Secondary').value;
  let Primary = document.getElementById('Primary').value;
  let BikeNetwork = document.getElementById('BikeNetwork').value;
  let Surface = document.getElementById('Surface').value


  // print the values to the console
  console.log("Max Speed: ", maxSpeed);
  console.log("Tertiary: ", Tertiary);
  console.log("Secondary ", Secondary);
  console.log("Primary: ", Primary);
  console.log("Bike Network: ", BikeNetwork);
  console.log("Surface: ", Surface);


  // Build the custom model using user inputs
  let customModel = {
    priority: [
      {"if": "road_class == TERTIARY", "multiply_by": Tertiary},
      {"if": "road_class == SECONDARY", "multiply_by": Secondary},
      {"if": "road_class == PRIMARY", "multiply_by": Primary},
      {"if": "bike_network == MISSING", "multiply_by": BikeNetwork},
      {"if": "surface == GRAVEL", "multiply_by": Surface}
          ]
  };


  // Prepare the request body including all dynamic parameters
  var requestBody = {
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
    var routes = data.paths;
    if (!routes || routes.length === 0) {
      alert("No routes found.");
      return;
    }
    var route = routes[0];
    drawRouteOnMap(route);
    
    // Calculate route distance and midpoint
    var distanceInKm = (route.distance / 1000).toFixed(2);
    var midIndex = Math.floor(route.points.coordinates.length / 2);
    var midCoord = route.points.coordinates[midIndex];
    
    // Create the popup at the midpoint
    new mapboxgl.Popup({ closeButton: false, closeOnClick: false })
      .setLngLat(midCoord)
      .setHTML("<div style='padding:5px; background-color: white; border: 1px solid #ccc; border-radius: 4px;'>Distance: " + distanceInKm + " km</div>")
      .addTo(map);
  })
  .catch(error => {
    console.error("Error fetching route:", error);
    alert("Failed to fetch route. See console for details.");
  });
  
  
});

