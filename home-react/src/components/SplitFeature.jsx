import React from 'react';
import { handleNavClick } from '../utils/navigation';

export function SplitFeature() {
  const handleImgError = (e) => {
    if (e.target.src.includes('..')) {
      e.target.src = './assets/split-feature-clean.jpg';
    } else {
      e.target.src = '../assets/split-feature-clean.jpg';
    }
  };

  return (
    <section className="home-section">
      <div className="home-split-header">
        <span className="home-dot-eyebrow">• Connected Capabilities</span>
        <h2 className="home-section-title">A competitive edge across every rental category</h2>
      </div>

      <div className="home-split">
        <div className="home-split-image-wrap">
          <img 
            src="./assets/split-feature-clean.jpg" 
            alt="Browse RentFlow Rentals" 
            onError={handleImgError}
          />
        </div>
        <div className="home-split-content">
          <p className="home-section-subtitle" style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>
            RentFlow bridges asset owners and renters seamlessly. Explore verified listings, compare daily or monthly pricing, and connect directly with verified owners without platform gatekeeping.
          </p>
          <a href="booking.html" className="home-split-link" onClick={(e) => handleNavClick(e, 'booking.html')}>
            Explore Rentals
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
