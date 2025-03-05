// layers.js – Manage toggling of hotels and shelters layers

import { getMap } from './map.js';

let hotelsVisible = false;
let sheltersVisible = false;

function toggleHotels() {
  const map = getMap();
  const button = document.getElementById('showHotels');
  
  if (!hotelsVisible) {
    map.addSource("hotels", {
      type: "geojson",
      data: "/static/data/denmark_hotels.geojson",
      cluster: true,
      clusterMaxZoom: 15
    });
    
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
    
    button.textContent = "Hide Hotels";
    hotelsVisible = true;
  } else {
    if (map.getLayer("clusters")) map.removeLayer("clusters");
    if (map.getLayer("cluster-count")) map.removeLayer("cluster-count");
    if (map.getLayer("unclustered-point")) map.removeLayer("unclustered-point");
    if (map.getSource("hotels")) map.removeSource("hotels");
    button.textContent = "Show Hotels";
    hotelsVisible = false;
  }
}

function toggleShelters() {
  const map = getMap();
  const button = document.getElementById('showShelters');
  
  if (!sheltersVisible) {
    map.addSource("shelters", {
      type: "geojson",
      data: "/static/data/denmark_shelters.geojson",
      cluster: true,
      clusterMaxZoom: 15
    });
    
    map.addLayer({
      id: "shelter-clusters",
      type: "circle",
      source: "shelters",
      filter: ["has", "point_count"],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#FFA500',
          100,
          '#FFD700',
          750,
          '#FF8C00'
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
    
    button.textContent = "Hide Shelters";
    sheltersVisible = true;
  } else {
    if (getMap().getLayer("shelter-clusters")) getMap().removeLayer("shelter-clusters");
    if (getMap().getLayer("shelter-cluster-count")) getMap().removeLayer("shelter-cluster-count");
    if (getMap().getLayer("shelter-unclustered-point")) getMap().removeLayer("shelter-unclustered-point");
    if (getMap().getSource("shelters")) getMap().removeSource("shelters");
    button.textContent = "Show Shelters";
    sheltersVisible = false;
  }
}

export function initLayers() {
  document.getElementById('showHotels').addEventListener('click', toggleHotels);
  document.getElementById('showShelters').addEventListener('click', toggleShelters);
}
