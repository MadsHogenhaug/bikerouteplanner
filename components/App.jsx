// App.js
// -----------------------------
// Main React application entry point

import React from 'react';
import Map from './map';
import { GeocoderProvider } from './geocoder';
import Sidebar from './sidebar';
import RouteFetcher from './route';



const App = () => {
  return (
    <Map>
    <Sidebar> 
    <GeocoderProvider>
      <RouteFetcher />
    </GeocoderProvider>
    </Sidebar>
    </Map>
  );
};

export default App;