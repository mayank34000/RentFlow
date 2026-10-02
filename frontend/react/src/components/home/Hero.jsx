import React from 'react';
import { Link } from 'react-router-dom';
import { HeroCircleFeatureMix } from './HeroCircleFeatureMix';
import { handleNavClick } from '../../utils/navigation';

export function Hero({ isLoggedIn }) {
  return (
    <section className="home-hero home-hero-centered" id="hero">
      {/* Centered Brand Tag */}
      <div className="home-hero-brand-tag">RENTFLOW</div>

      {/* Centered Editorial Title */}
      <h1 className="home-hero-title">
        The smartest direct<br />
        <em>rental &amp; booking</em> platform
      </h1>

      {/* Centered Subtitle */}
      <p className="home-hero-subtitle">
        Find, compare, and book verified listings directly from asset owners with complete pricing transparency, verified provider contacts, and zero middleman delay.
      </p>

      {/* Central "R" Circle Feature Mixing Animation */}
      <HeroCircleFeatureMix />

      {/* Centered Action Buttons */}
      <div className="home-hero-actions">
        {!isLoggedIn && (
          <Link to="/signup" className="home-btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            Start for Free
          </Link>
        )}
        <a href="#how-it-works" className="home-btn-secondary" onClick={(e) => handleNavClick(e, '#how-it-works')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="10 8 16 12 10 16 10 8"/>
          </svg>
          See How it Works
        </a>
      </div>
    </section>
  );
}
