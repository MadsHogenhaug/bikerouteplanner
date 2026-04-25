import React from 'react';
import Map from './map';
import { GeocoderProvider } from './geocoder';
import Sidebar from './sidebar';
import RouteFetcher from './route-fetcher';
import PoiLayers from './PoiLayers';
import MapStyleSwitcher from './MapStyleSwitcher';

const App = () => (
  <Map>
    <Sidebar>
      <GeocoderProvider>
        <RouteFetcher />
        <PoiLayers />
      </GeocoderProvider>
    </Sidebar>
    <MapStyleSwitcher />
  </Map>
);

export default App;
