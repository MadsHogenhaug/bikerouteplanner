// cluster.js – Register cluster and popup event handlers for hotels and shelters

import { getMap } from './map.js';
// setDestination is available globally from geocoder.js

export function initClusterEvents() {
  const map = getMap();
  
  // Shelters: cluster expansion and popup
  map.on('click', 'shelter-clusters', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['shelter-clusters'] });
    const clusterId = features[0].properties.cluster_id;
    map.getSource('shelters').getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom: zoom
      });
    });
  });
  
  map.on('mouseenter', 'shelter-clusters', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'shelter-clusters', () => {
    map.getCanvas().style.cursor = '';
  });
  
  map.on('click', 'shelter-unclustered-point', (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();
    const name = e.features[0].properties.name;
    const website = e.features[0].properties.website;
    const coords_lng = coordinates[0];
    const coords_lat = coordinates[1];
    const websiteDisplay = website ? `<a href="${website}" target="_blank">${website}</a>` : "No website available";
    
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
  
  // Hotels: cluster expansion and popup
  map.on('click', 'clusters', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    const clusterId = features[0].properties.cluster_id;
    map.getSource('hotels').getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom: zoom
      });
    });
  });
  
  map.on('click', 'unclustered-point', (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();
    const name = e.features[0].properties.name;
    const website = e.features[0].properties.website;
    const websiteDisplay = website ? `<a href="${website}" target="_blank">${website}</a>` : "No website available";
    
    if (['mercator', 'equirectangular'].includes(map.getProjection().name)) {
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }
    }
    
    new mapboxgl.Popup()
      .setLngLat(coordinates)
      .setHTML(`<strong>${name}</strong><br>${websiteDisplay}`)
      .addTo(map);
  });
  
  map.on('mouseenter', 'clusters', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'clusters', () => {
    map.getCanvas().style.cursor = '';
  });
}
