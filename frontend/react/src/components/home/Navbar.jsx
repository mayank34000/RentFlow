import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { ProfileDropdown } from './ProfileDropdown';
import { MobileMenu } from './MobileMenu';
import { handleNavClick } from '../../utils/navigation';

export function Navbar({ auth }) {
  const { scrolled, hiddenNav } = useScrollDirection();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { isLoggedIn, user, profileImage, isPremium, logout } = auth;

  return (
    <>
      <header className={`home-header ${scrolled ? 'scrolled' : ''} ${hiddenNav ? 'hidden-nav' : ''}`}>
        <Link to="/" className="home-logo">
          RENT<span>FLOW</span>
        </Link>

        <nav className="home-nav-links">
          <a href="#features" onClick={(e) => handleNavClick(e, '#features')}>Features</a>
          <Link to="/booking">Browse Rentals</Link>
          {!isPremium && (
            <Link to="/premium" style={{ color: '#f59e0b', fontWeight: 600 }}>👑 Go Premium</Link>
          )}
          <Link to="/create-listing" style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>+ Post Listing</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>

        <div className="home-nav-cta">
          {!isLoggedIn ? (
            <>
              <Link to="/login" className="btn-ghost">Log In</Link>
              <Link to="/signup" className="btn-nav-primary">Get Started</Link>
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
