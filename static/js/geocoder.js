// geocoder.js – Set up the start/end geocoders and expose coordinate getters

import { getMap } from './map.js';

let startCoords, endCoords;
let viaCoords = []; // Array to store via point coordinates
let startGeocoder, endGeocoder;
let viaGeocoders = []; // Array to store dynamic via geocoder instances

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

  // Attach event listener to the "Add Via Point" button
  document.getElementById('addViaPoint').addEventListener('click', addViaPoint);

  // Append the start and end geocoders to the DOM
  document.getElementById('startGeocoder').appendChild(startGeocoder.onAdd(map));
  document.getElementById('endGeocoder').appendChild(endGeocoder.onAdd(map));
  
  // Listen for results from the start and end geocoders
  startGeocoder.on('result', (e) => {
    startCoords = e.result.center;
  });
  endGeocoder.on('result', (e) => {
    endCoords = e.result.center;
  });
}

function addViaPoint() {
  const map = getMap();
  const viaContainer = document.getElementById('viaGeocodersContainer');
  
  // Create a new via geocoder instance with a dynamic placeholder
  const viaGeocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    placeholder: `Via point ${viaGeocoders.length + 1}`
  });
  
  // Create a wrapper for the geocoder and its remove button
  const geocoderWrapper = document.createElement("div");
  geocoderWrapper.classList.add("geocoder-container");
  
  // Create a remove button for this via point
  const removeBtn = document.createElement("button");
  removeBtn.innerText = "✖";
  removeBtn.classList.add("remove-btn");
  removeBtn.onclick = function () {
    // Remove the geocoder from the array and its coordinate from viaCoords
    const index = viaGeocoders.indexOf(viaGeocoder);
    if (index > -1) {
      viaGeocoders.splice(index, 1);
      viaCoords.splice(index, 1);
    }
    viaContainer.removeChild(geocoderWrapper);
  };
  
  // Append the geocoder widget and remove button to the wrapper
  geocoderWrapper.appendChild(viaGeocoder.onAdd(map));
  geocoderWrapper.appendChild(removeBtn);
  viaContainer.appendChild(geocoderWrapper);
  
  // Save the new via geocoder
  viaGeocoders.push(viaGeocoder);
  
  // Listen for results and update the viaCoords array at the appropriate index
  viaGeocoder.on('result', (e) => {
    const index = viaGeocoders.indexOf(viaGeocoder);
    viaCoords[index] = e.result.center;
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
