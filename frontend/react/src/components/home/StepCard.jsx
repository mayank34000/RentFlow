import React from 'react';

export function StepCard({ step }) {
  const { num, title, text, badge } = step;

  return (
    <div className="home-step-card">
      <div className="home-step-num">{num}</div>
      <h3 className="home-step-title">{title}</h3>
      <p className="home-step-text">{text}</p>
      {badge && (
        <span className="home-step-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          {badge}
        </span>
      )}
    </div>
  );
}
