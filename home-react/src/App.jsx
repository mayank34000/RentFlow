import React from 'react';
import './styles/home.css';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { OmniCircleShowcase } from './components/OmniCircleShowcase';
import { CitiesMarquee } from './components/CitiesMarquee';
import { SplitFeature } from './components/SplitFeature';
import { FeatureGrid } from './components/FeatureGrid';
import { HowItWorks } from './components/HowItWorks';
import { Testimonials } from './components/Testimonials';
import { UpcomingTeaser } from './components/UpcomingTeaser';
import { Footer } from './components/Footer';
import { IntroRReveal } from './components/IntroRReveal';

export default function App() {
  const auth = useAuth();
  useTheme();

  return (
    <div className="home-wrapper">
      <IntroRReveal />
      <video className="home-bg-video" autoPlay muted loop playsInline>
        <source src="../assets/video.mp4" type="video/mp4" />
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
