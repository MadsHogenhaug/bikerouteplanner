// geocoder.js – Set up the start/end geocoders and expose coordinate getters

import { getMap } from './map.js';

let startCoords, endCoords, viaCoords;
let startGeocoder, endGeocoder, viaGeocoder;

export function initGeocoders() {
  const map = getMap();
  startGeocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    placeholder: "Start location"
  });
  endGeocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    placeholder: "Destination"
  });

  viaGeocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    placeholder: "Via point"
  });

  // console.log("Start:", document.getElementById('startGeocoder'));
  // console.log("Via:", document.getElementById('viaGeocoder'));
  // console.log("End:", document.getElementById('endGeocoder'));

  
  document.getElementById('startGeocoder').appendChild(startGeocoder.onAdd(map));
  document.getElementById('viaGeocoder').appendChild(viaGeocoder.onAdd(map));
  document.getElementById('endGeocoder').appendChild(endGeocoder.onAdd(map));
  
  startGeocoder.on('result', (e) => {
    startCoords = e.result.center;
  });
  endGeocoder.on('result', (e) => {
    endCoords = e.result.center;
  });
  viaGeocoder.on('result', (e) => {
    viaCoords = e.result.center;
  });
}

export function getStartCoords() {
  return startCoords;
}

export function getEndCoords() {
  return endCoords;
}

export function getViaCoords() {
  return viaCoords;
}


export function setEndCoords(coords) {
  endCoords = coords;
  endGeocoder.setInput(`${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`);
}



// Expose setDestination globally for inline popup handlers (used in cluster.js)
window.setDestination = setEndCoords;
