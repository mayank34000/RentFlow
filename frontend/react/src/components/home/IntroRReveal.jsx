import React, { useState, useEffect } from 'react';

export function IntroRReveal() {
  const [stage, setStage] = useState('active'); // 'active' | 'zooming' | 'hidden'

  useEffect(() => {
    // Stage 1: Trigger zoom-out after 100ms
    const timer1 = setTimeout(() => {
      setStage('zooming');
    }, 150);

    // Stage 2: Hide intro screen completely after 1500ms
    const timer2 = setTimeout(() => {
      setStage('hidden');
    }, 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (stage === 'hidden') return null;

  return (
    <div className={`home-intro-overlay ${stage}`}>
      <div className="home-intro-content">
        <div className="home-intro-r-glow" />
        <div className="home-intro-r-badge">
          <span>R</span>
        </div>
        <div className="home-intro-brand">RENTFLOW</div>
      </div>
    </div>
  );
}
