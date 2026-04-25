'use client';

import React from 'react';
import { isEndpointStop, metersToKm, stopDeltaKm, stopTitle } from '@/lib/formatters';

const ItineraryList = ({ itinerary }) => {
  if (!itinerary?.length) return null;

  return (
    <div className="itinerary-display">
      <h3>Planned Itinerary</h3>
      <ul>
        {itinerary.map((stop, index) => {
          const deltaKm = stopDeltaKm(stop, itinerary[index - 1]);
          const title = stopTitle(stop);
          const heading = index === 0 ? title : `Day ${index}: ${title}`;
          return (
            <li key={`${stop.type}-${index}-${stop.name}`} className="itinerary-stop">
              <strong>{heading}</strong>
              <br />
              <span className="itinerary-details">
                {metersToKm(stop.routeDistance)} km total
                {index > 0 && ` (+${deltaKm.toFixed(1)} km)`}
                {!isEndpointStop(stop) && `, ~${stop.offRoute.toFixed(0)}m detour`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ItineraryList;
