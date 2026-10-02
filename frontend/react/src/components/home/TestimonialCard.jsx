import React from 'react';

export function TestimonialCard({ item }) {
  const { stars, text, name, location, initial, bg } = item;

  return (
    <div className="home-testimonial-card">
      <div>
        <div className="home-stars">{stars}</div>
        <p className="home-testimonial-text">{text}</p>
      </div>
      <div className="home-author">
        <div className="home-author-avatar" style={{ background: bg, color: '#ffffff' }}>
          {initial}
        </div>
        <div>
          <div className="home-author-name">{name}</div>
          <div className="home-author-location">{location}</div>
        </div>
      </div>
    </div>
  );
}
