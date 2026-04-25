export const metersToKm = (meters) => (meters / 1000).toFixed(1);

export const formatCoords = ([lng, lat]) =>
  `Lng: ${lng.toFixed(5)}, Lat: ${lat.toFixed(5)}`;

export const isEndpointStop = (stop) =>
  stop.type === 'start' || stop.type === 'destination';

export const stopTitle = (stop) =>
  isEndpointStop(stop) ? stop.type[0].toUpperCase() + stop.type.slice(1) : stop.name;

export const stopDeltaKm = (stop, prev) =>
  prev ? (stop.routeDistance - prev.routeDistance) / 1000 : 0;
