import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export function ProfileDropdown({ user, profileImage, isPremium, logout }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const firstName = (user?.name || user?.username || 'User').split(' ')[0];
  const premiumText = isPremium ? 'Extend Premium' : 'Get Premium';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleWalletClick = (e) => {
    e.preventDefault();
    setOpen(false);
    if (typeof window.openWalletModal === 'function') {
      window.openWalletModal();
    } else {
      console.warn('openWalletModal is not available on window');
    }
  };

  return (
    <div className="home-profile-wrap" ref={dropdownRef}>
      <div 
        className="home-profile-trigger" 
        onClick={(e) => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
      >
        <div className="home-profile-avatar">
          <img src={profileImage} alt="Profile" />
        </div>
        <span className="home-profile-name">{firstName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {open && (
        <div className="home-dropdown-menu">
          <Link to="/profile" onClick={() => setOpen(false)}>My Profile</Link>
          <a href="#" onClick={handleWalletClick}>My Wallet</a>
          <Link to="/premium" onClick={() => setOpen(false)} style={{ color: '#f59e0b', fontWeight: 600 }}>👑 {premiumText}</Link>
          <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
          <button onClick={() => { setOpen(false); logout(); }} style={{ color: '#ef4444', fontWeight: 600 }}>Logout</button>
        </div>
      )}
    </div>
  );
}
