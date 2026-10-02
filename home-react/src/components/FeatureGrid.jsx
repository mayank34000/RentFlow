import React from 'react';
import { FeatureCard } from './FeatureCard';
import { featuresData } from '../data/features';

export function FeatureGrid() {
  return (
    <section className="home-section" id="features">
      <div className="home-omni-header">
        <span className="home-dot-eyebrow" style={{ display: 'block', marginBottom: '0.8rem' }}>• PLATFORM ADVANTAGES</span>
        <div className="home-omni-badge">
          <span>RENTFLOW</span>
          <span className="plus">+</span>
        </div>
        <h2 className="home-section-title" style={{ maxWidth: '800px' }}>
          One unified workflow for search, contact &amp; bookings
        </h2>
      </div>

      <div className="home-grid">
        {featuresData.map(feature => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
}
