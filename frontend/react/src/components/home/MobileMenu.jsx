import React from 'react';
import { Link } from 'react-router-dom';
import { handleNavClick } from '../../utils/navigation';

export function MobileMenu({ open, isLoggedIn, isPremium, logout, onClose }) {
  return (
    <div className={`home-mobile-menu ${open ? 'open' : ''}`}>
      <a href="#features" onClick={(e) => { onClose(); handleNavClick(e, '#features'); }}>Features</a>
      <Link to="/booking" onClick={onClose}>Browse Rentals</Link>
      {!isPremium && (
        <Link to="/premium" style={{ color: '#f59e0b' }} onClick={onClose}>👑 Go Premium</Link>
      )}
      <Link to="/create-listing" style={{ color: 'var(--accent-bright)' }} onClick={onClose}>+ Post Listing</Link>
      <Link to="/about" onClick={onClose}>About</Link>
      <Link to="/contact" onClick={onClose}>Contact</Link>

      <div style={{ height: '1px', background: 'var(--border)', margin: '10px 0' }} />

      {!isLoggedIn ? (
        <>
          <Link to="/login" onClick={onClose}>Log In</Link>
          <Link to="/signup" style={{ color: 'var(--accent-bright)' }} onClick={onClose}>Get Started Free</Link>
        </>
      ) : (
        <>
          <Link to="/profile" onClick={onClose}>My Profile</Link>
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
