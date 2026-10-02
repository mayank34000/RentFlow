import React from 'react';
import { citiesData } from '../data/cities';

export function CitiesMarquee() {
  return (
    <div className="home-marquee-wrap">
      <div className="home-marquee-label">Trusted by users across top cities</div>
      <div className="home-marquee-track">
        <div className="home-marquee-group">
          {citiesData.map((city, idx) => (
            <React.Fragment key={`c1-${idx}`}>
              <span>{city}</span>
              <span className="dot">•</span>
            </React.Fragment>
          ))}
        </div>
        <div className="home-marquee-group" aria-hidden="true">
          {citiesData.map((city, idx) => (
            <React.Fragment key={`c2-${idx}`}>
              <span>{city}</span>
              <span className="dot">•</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
