import React from 'react';

export function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="home-section-header">
      {eyebrow && <p className="home-eyebrow">{eyebrow}</p>}
      {title && <h2 className="home-section-title">{title}</h2>}
      {subtitle && <p className="home-section-subtitle">{subtitle}</p>}
    </div>
  );
}
