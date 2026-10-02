import React, { useState, useEffect } from 'react';

const showcaseItems = [
  {
    id: 'vehicles',
    name: 'Vehicles',
    tagline: 'Bikes, SUVs & Luxury Cars',
    video: '/assets/vehicles-video.mp4',
    fallbackVideo: './assets/vehicles-video.mp4',
    accentColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
  {
    id: 'electronics',
    name: 'Electronics',
    tagline: 'MacBooks, Consoles & Devices',
    video: '/assets/electronics-video.mp4',
    fallbackVideo: './assets/electronics-video.mp4',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
  {
    id: 'fashion',
    name: 'Fashion',
    tagline: 'Designer Suits, Watches & Wear',
    video: '/assets/fashion-video.mp4',
    fallbackVideo: './assets/fashion-video.mp4',
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
  {
    id: 'tools',
    name: 'Tools',
    tagline: 'Drills & Power Equipment',
    video: '/assets/tools-video.mp4',
    fallbackVideo: './assets/tools-video.mp4',
    accentColor: '#84cc16',
    glowColor: 'rgba(132, 204, 22, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(132, 204, 22, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
  {
    id: 'property',
    name: 'Property',
    tagline: 'Studios, Apartments & Venues',
    video: '/assets/property-video.mp4',
    fallbackVideo: './assets/property-video.mp4',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
  {
    id: 'sports',
    name: 'Sports',
    tagline: 'Cycles, Golf & Fitness Gear',
    video: '/assets/sports-video.mp4',
    fallbackVideo: './assets/sports-video.mp4',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
];

export function OmniCircleShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % showcaseItems.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const activeItem = showcaseItems[activeIndex];

  return (
    <section className="home-section home-omni-circle-section" id="categories">
      <div className="home-circle-container">
        {/* Segment Title */}
        <div className="home-omni-header" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <span className="home-dot-eyebrow">• RENTAL CATEGORIES</span>
          <h2 className="home-section-title">Explore Verified Rentals by Category</h2>
        </div>

        {/* Giant Omnicom "O" Ring Container */}
        <div className="home-o-ring-wrapper">
          <div className="home-o-ring-graphic">
            {/* Spinning Arc Line with Shifting Accent Color */}
            <svg className="home-o-svg" viewBox="0 0 500 500">
              <circle 
                cx="250" 
                cy="250" 
                r="220" 
                className="home-o-bg-circle"
              />
              <circle 
                cx="250" 
                cy="250" 
                r="220" 
                className="home-o-active-arc"
                style={{
                  stroke: activeItem.accentColor,
                  strokeDasharray: '1382',
                  strokeDashoffset: 1382 - (1382 / showcaseItems.length) * (activeIndex + 1),
                  filter: `drop-shadow(0 0 16px ${activeItem.accentColor})`,
                }}
              />
            </svg>

            {/* Central Video Display inside the "O" Ring */}
            <div className="home-o-center-content" style={{ background: activeItem.bgGradient }}>
              <video
                key={activeItem.id}
                autoPlay
                muted
                loop
                playsInline
                className="home-o-image-fade"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  pointerEvents: 'none'
                }}
                ref={(el) => {
                  if (el) {
                    el.muted = true;
                    el.volume = 0;
                    el.play().catch(() => {});
                  }
                }}
              >
                <source src={activeItem.video} type="video/mp4" />
                <source src={activeItem.fallbackVideo} type="video/mp4" />
              </video>
              <div className="home-o-center-caption">
                <span className="home-o-badge" style={{ color: activeItem.accentColor }}>
                  {activeItem.name}
                </span>
              </div>
            </div>
          </div>

          {/* Radial Nodes around the "O" Ring */}
          <div className="home-o-nodes-wrap">
            {showcaseItems.map((item, idx) => {
              const angle = (idx / showcaseItems.length) * 360 - 90;
              const radius = 250; // px
              const x = radius * Math.cos((angle * Math.PI) / 180);
              const y = radius * Math.sin((angle * Math.PI) / 180);

              const isActive = idx === activeIndex;

              return (
                <div
                  key={item.id}
                  className={`home-o-node ${isActive ? 'active' : ''}`}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  onClick={() => setActiveIndex(idx)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <div 
                    className="home-o-node-inner"
                    style={{
                      borderColor: isActive ? item.accentColor : 'var(--border)',
                      boxShadow: isActive ? `0 0 24px ${item.glowColor}` : '0 10px 25px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <span className="home-o-node-num" style={{ color: item.accentColor }}>0{idx + 1}</span>
                    <span className="home-o-node-title">{item.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Text Details & Category Controls beneath */}
        <div className="home-o-controls">
          <div className="home-o-pill-tabs">
            {showcaseItems.map((item, idx) => (
              <button
                key={item.id}
                className={`home-o-pill-tab ${idx === activeIndex ? 'active' : ''}`}
                style={{
                  background: idx === activeIndex ? item.accentColor : undefined,
                  borderColor: idx === activeIndex ? item.accentColor : undefined,
                  boxShadow: idx === activeIndex ? `0 4px 20px ${item.glowColor}` : undefined,
                }}
                onClick={() => setActiveIndex(idx)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
