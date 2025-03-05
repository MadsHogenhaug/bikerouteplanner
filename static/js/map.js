// map.js – Initialize the Mapbox map and expose the instance

// Assumes mapboxgl is loaded globally from the CDN in index.html
let map;

export function initMap() {
  mapboxgl.accessToken = window.mapboxToken; // from index.html
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [12.5700724, 55.6867243],
    zoom: 10
  });
  map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
  return map;
}

export function getMap() {
  return map;
}
