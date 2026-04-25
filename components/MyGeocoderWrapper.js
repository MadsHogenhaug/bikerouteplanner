'use client';

import dynamic from 'next/dynamic';

const Geocoder = dynamic(
  () => import('@mapbox/search-js-react').then((mod) => mod.Geocoder),
  { ssr: false }
);

export default function MyGeocoderWrapper(props) {
  return <Geocoder {...props} />;
}
