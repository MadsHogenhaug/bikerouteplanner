import mapboxgl from 'mapbox-gl';

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (!MAPBOX_TOKEN && typeof window !== 'undefined') {
  console.warn('Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN. Set it in .env.local.');
}

mapboxgl.accessToken = MAPBOX_TOKEN;
