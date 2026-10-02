import React from 'react';
import { handleNavClick } from '../utils/navigation';

export function MobileMenu({ open, isLoggedIn, isPremium, logout, onClose }) {
  const handleClick = (e, target) => {
    onClose();
    handleNavClick(e, target);
  };

  return (
    <div className={`home-mobile-menu ${open ? 'open' : ''}`}>
      <a href="#features" onClick={(e) => handleClick(e, '#features')}>Features</a>
      <a href="booking.html" onClick={(e) => handleClick(e, 'booking.html')}>Browse Rentals</a>
      {!isPremium && (
        <a href="premium.html" style={{ color: '#f59e0b' }} onClick={(e) => handleClick(e, 'premium.html')}>👑 Go Premium</a>
      )}
      <a href="create_listings.html" style={{ color: 'var(--accent-bright)' }} onClick={(e) => handleClick(e, 'create_listings.html')}>+ Post Listing</a>
      <a href="about.html" onClick={(e) => handleClick(e, 'about.html')}>About</a>
      <a href="contact.html" onClick={(e) => handleClick(e, 'contact.html')}>Contact</a>

      <div style={{ height: '1px', background: 'var(--border)', margin: '10px 0' }} />

      {!isLoggedIn ? (
        <>
          <a href="login.html" onClick={(e) => handleClick(e, 'login.html')}>Log In</a>
          <a href="signup.html" style={{ color: 'var(--accent-bright)' }} onClick={(e) => handleClick(e, 'signup.html')}>Get Started Free</a>
        </>
      ) : (
        <>
          <a href="profile.html" onClick={(e) => handleClick(e, 'profile.html')}>My Profile</a>
          <button 
            onClick={() => { onClose(); logout(); }}
            style={{ background: 'transparent', border: 'none', color: '#ef4444', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
          >
            Logout
          </button>
        </>
      )}
    </div>
  );
}
