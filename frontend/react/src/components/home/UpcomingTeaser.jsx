import React from 'react';
import { Link } from 'react-router-dom';

export function UpcomingTeaser() {
  return (
    <section className="home-section" style={{ paddingTop: 0 }}>
      <Link 
        to="/upcoming-features" 
        className="home-teaser-card"
        style={{ display: 'block', textDecoration: 'none', cursor: 'pointer' }}
      >
        <p className="home-eyebrow" style={{ color: '#60a5fa', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.8rem' }}>• THE FUTURE</p>
        <h2 className="home-section-title" style={{ marginBottom: '1rem', color: '#ffffff' }}>
          Exciting New Features Are Coming
        </h2>
        <p style={{ margin: '0 auto 2rem', fontSize: '1.05rem', color: '#cbd5e1', maxWidth: '680px', lineHeight: 1.6 }}>
          We are continuously pushing the boundaries of what a rental platform can be. Click here to get a sneak peek at what we're building next.
        </p>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '1rem',
          background: 'var(--accent-blue)',
          padding: '12px 28px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
        }}>
          View Upcoming Features
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </Link>
    </section>
  );
}
