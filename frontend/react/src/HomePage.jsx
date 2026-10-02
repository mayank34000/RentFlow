import React from 'react';
import './styles/tokens.css';
import './styles/home.css';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

import { Navbar } from './components/home/Navbar';
import { Hero } from './components/home/Hero';
import { OmniCircleShowcase } from './components/home/OmniCircleShowcase';
import { CitiesMarquee } from './components/home/CitiesMarquee';
import { SplitFeature } from './components/home/SplitFeature';
import { FeatureGrid } from './components/home/FeatureGrid';
import { HowItWorks } from './components/home/HowItWorks';
import { Testimonials } from './components/home/Testimonials';
import { UpcomingTeaser } from './components/home/UpcomingTeaser';
import { Footer } from './components/home/Footer';
import { IntroRReveal } from './components/home/IntroRReveal';

export default function HomePage() {
  const auth = useAuth();
  useTheme();

  return (
    <div className="home-wrapper">
      <IntroRReveal />
      <video className="home-bg-video" autoPlay muted loop playsInline>
        <source src="/assets/video.mp4" type="video/mp4" />
        <source src="./assets/video.mp4" type="video/mp4" />
      </video>
      <div className="home-overlay" />

      <Navbar auth={auth} />
      <main>
        <Hero isLoggedIn={auth.isLoggedIn} />
        <OmniCircleShowcase />
        <CitiesMarquee />
        <SplitFeature />
        <FeatureGrid />
        <HowItWorks />
        <Testimonials />
        <UpcomingTeaser />
      </main>
      <Footer />
    </div>
  );
}
