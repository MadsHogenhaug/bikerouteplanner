'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import only the Geocoder, disabling SSR
const GeocoderNoSSR = dynamic(
  () => import('@mapbox/search-js-react').then((mod) => mod.Geocoder),
  { ssr: false }
);

export default function MyGeocoderWrapper(props) {
  return (
    <GeocoderNoSSR {...props} />
  );
}
