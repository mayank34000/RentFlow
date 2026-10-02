import React, { useState } from 'react';
import { useScrollDirection } from '../hooks/useScrollDirection';
import { ProfileDropdown } from './ProfileDropdown';
import { MobileMenu } from './MobileMenu';
import { handleNavClick } from '../utils/navigation';

export function Navbar({ auth }) {
  const { scrolled, hiddenNav } = useScrollDirection();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { isLoggedIn, user, profileImage, isPremium, logout } = auth;

  return (
    <>
      <header className={`home-header ${scrolled ? 'scrolled' : ''} ${hiddenNav ? 'hidden-nav' : ''}`}>
        <a href="index.html" className="home-logo" onClick={(e) => handleNavClick(e, 'index.html')}>
          RENT<span>FLOW</span>
        </a>

        <nav className="home-nav-links">
          <a href="#features" onClick={(e) => handleNavClick(e, '#features')}>Features</a>
          <a href="booking.html" onClick={(e) => handleNavClick(e, 'booking.html')}>Browse Rentals</a>
          {!isPremium && (
            <a href="premium.html" onClick={(e) => handleNavClick(e, 'premium.html')} style={{ color: '#f59e0b', fontWeight: 600 }}>👑 Go Premium</a>
          )}
          <a href="create_listings.html" onClick={(e) => handleNavClick(e, 'create_listings.html')} style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>+ Post Listing</a>
          <a href="about.html" onClick={(e) => handleNavClick(e, 'about.html')}>About</a>
          <a href="contact.html" onClick={(e) => handleNavClick(e, 'contact.html')}>Contact</a>
        </nav>

        <div className="home-nav-cta">
          {!isLoggedIn ? (
            <>
              <a href="login.html" className="btn-ghost" onClick={(e) => handleNavClick(e, 'login.html')}>Log In</a>
              <a href="signup.html" className="btn-nav-primary" onClick={(e) => handleNavClick(e, 'signup.html')}>Get Started</a>
            </>
          ) : (
            <ProfileDropdown 
              user={user} 
              profileImage={profileImage} 
              isPremium={isPremium} 
              logout={logout} 
            />
          )}
        </div>

        <button 
          className="home-hamburger" 
          onClick={() => setMobileOpen(prev => !prev)}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <MobileMenu 
        open={mobileOpen} 
        isLoggedIn={isLoggedIn} 
        isPremium={isPremium} 
        logout={logout} 
        onClose={() => setMobileOpen(false)} 
      />
    </>
  );
}
