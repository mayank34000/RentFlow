import React from 'react';
import { SectionHeader } from './SectionHeader';
import { StepCard } from './StepCard';
import { stepsData } from '../../data/steps';

export function HowItWorks() {
  return (
    <section className="home-section" id="how-it-works">
      <SectionHeader 
        eyebrow="THE PROCESS" 
        title="Rent in 3 simple steps" 
        subtitle="Follow these simple steps to find, unlock, and secure your next rental." 
      />
      <div className="home-steps">
        {stepsData.map(step => (
          <StepCard key={step.num} step={step} />
        ))}
      </div>
    </section>
  );
}
