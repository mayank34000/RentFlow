import React from 'react';
import { Link } from 'react-router-dom';
import { testimonialsData } from '../../data/testimonials';

export function Testimonials() {
  return (
    <section className="home-section" id="testimonials">
      <div className="home-whats-new-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <span className="home-dot-eyebrow">• LATEST NEWS &amp; REVIEWS</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="home-section-title" style={{ margin: 0 }}>What's new across RentFlow</h2>
          <Link to="/upcoming-features" className="home-view-all-btn">
            View All
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>

      <div className="home-testimonials-grid">
        {testimonialsData.map(item => (
          <div key={item.id} className="home-news-card">
            <div>
              <p className="home-news-date">SEPTEMBER 28, 2026</p>
              <h3 className="home-news-title">{item.text}</h3>
            </div>
            <div className="home-news-footer">
              <div className="home-news-author">
                <div className="home-author-avatar" style={{ background: item.bg, color: '#ffffff' }}>
                  {item.initial}
                </div>
                <div>
                  <div className="home-author-name">{item.name}</div>
                  <div className="home-author-location">{item.location}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
