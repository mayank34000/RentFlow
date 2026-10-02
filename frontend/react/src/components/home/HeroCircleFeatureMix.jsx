import React, { useState, useEffect } from 'react';
import { featuresData } from '../../data/features';

export function HeroCircleFeatureMix() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [converged, setConverged] = useState(false);

  useEffect(() => {
    // Trigger flying inward convergence animation after 100ms
    const timer = setTimeout(() => {
      setConverged(true);
    }, 150);

    // Auto rotate feature focus
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % featuresData.length);
    }, 3800);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const current = featuresData[activeFeature];

  return (
    <div className="home-hero-r-mix-container">
      {/* Central "R" Circle graphic */}
      <div className="home-r-circle-wrap">
        <svg className="home-r-svg-ring" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="180" className="home-r-ring-bg" />
          <circle 
            cx="200" 
            cy="200" 
            r="180" 
            className="home-r-ring-active"
            style={{
              stroke: current.accentColor || '#3b82f6',
              strokeDasharray: '1130',
              strokeDashoffset: 1130 - (1130 / featuresData.length) * (activeFeature + 1),
              filter: `drop-shadow(0 0 16px ${current.accentColor || '#3b82f6'})`,
            }}
          />
        </svg>

        {/* Central Energy Pulse Ripple */}
        <div className="home-r-pulse-glow" style={{ borderColor: current.accentColor }} />

        {/* Central "R" Logo & Feature Convergence Core */}
        <div className="home-r-core">
          <div className="home-r-letter">R</div>
          <div className="home-r-feature-info" key={current.id}>
            <span className="home-r-badge" style={{ color: current.accentColor }}>
              {current.title}
            </span>
            <p className="home-r-text">{current.text}</p>
          </div>
        </div>

        {/* Flying 6 Feature Nodes Converging / Mixing into "R" */}
        <div className={`home-r-nodes-orbit ${converged ? 'converged' : 'scattered'}`}>
          {featuresData.map((feat, idx) => {
            const angle = (idx / featuresData.length) * 360 - 90;
            const radius = 230; // px radius
            
            // Scattered starting offset (flying in from air)
            const scatterRadius = 450;
            const targetX = radius * Math.cos((angle * Math.PI) / 180);
            const targetY = radius * Math.sin((angle * Math.PI) / 180);

            const scatteredX = scatterRadius * Math.cos((angle * Math.PI) / 180);
            const scatteredY = scatterRadius * Math.sin((angle * Math.PI) / 180);

            const posX = converged ? targetX : scatteredX;
            const posY = converged ? targetY : scatteredY;

            const isActive = idx === activeFeature;

            return (
              <div
                key={feat.id}
                className={`home-r-node ${isActive ? 'active' : ''}`}
                style={{
                  transform: `translate(${posX}px, ${posY}px) scale(${converged ? (isActive ? 1.12 : 1) : 0.4})`,
                  opacity: converged ? 1 : 0,
                  transitionDelay: `${idx * 0.12}s`,
                }}
                onClick={() => setActiveFeature(idx)}
                onMouseEnter={() => setActiveFeature(idx)}
              >
                <div 
                  className="home-r-node-pill"
                  style={{
                    borderColor: isActive ? feat.accentColor : 'var(--border)',
                    boxShadow: isActive ? `0 0 24px ${feat.accentColor}80` : '0 10px 25px rgba(0,0,0,0.4)',
                  }}
                >
                  <span className="home-r-node-dot" style={{ background: feat.accentColor }} />
                  <span className="home-r-node-label">{feat.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
