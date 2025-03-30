// components/App.jsx
import React from 'react';
import Map from './map';
import { GeocoderProvider } from './geocoder';
import Sidebar from './sidebar';
import RouteFetcher from './route-fetcher'; // Ensure filename matches if you renamed it
import PoiLayers from './PoiLayers';       // Import the new component

const App = () => {
  return (
    <Map>
      <Sidebar>
        <GeocoderProvider>
          <RouteFetcher />
          <PoiLayers />
        </GeocoderProvider>
      </Sidebar>
    </Map>
  );
};

export default App;