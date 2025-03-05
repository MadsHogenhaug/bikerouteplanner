// main.js – Bootstraps the application by initializing all modules

import { initMap } from './map.js';
import { initGeocoders } from './geocoder.js';
import { initSidebar } from './sidebar.js';
import { initLayers } from './layers.js';
import { initRouteFetcher } from './route.js';
import { initClusterEvents } from './cluster.js';

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initGeocoders();
  initSidebar();
  initLayers();
  initRouteFetcher();
  initClusterEvents();
});
