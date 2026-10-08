import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isLoggedIn, getAuthUser, clearAuthSession } from '../services/api';

// Custom hook for scroll direction to hide/show navbar
export function useScrollDirection() {
  const [scrollState, setScrollState] = useState({ scrolled: false, hiddenNav: false });
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      // Allow pages to disable this behavior
      if (window.__DISABLE_LEGACY_NAVBAR_SCROLL__) {
          return setScrollState({ scrolled: window.scrollY > 40, hiddenNav: false });
      }
      const currentScrollY = window.scrollY;
      const isScrolled = currentScrollY > 40;
      const isHidden = currentScrollY > 120 && currentScrollY > lastScrollY.current;
      setScrollState({ scrolled: isScrolled, hiddenNav: isHidden });
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollState;
}

function ProfileDropdown({ user, profileImage, isPremium, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  const [isDark, setIsDark] = useState(() => {
      if (typeof document !== 'undefined') {
          return !document.body.classList.contains('light-theme');
      }
      return true;
  });

  const toggleTheme = (e) => {
    e.stopPropagation();
    if (isDark) {
        document.body.classList.add("light-theme");
        localStorage.setItem("theme", "light");
        setIsDark(false);
    } else {
        document.body.classList.remove("light-theme");
        localStorage.setItem("theme", "dark");
        setIsDark(true);
    }
  };
  
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="home-profile-menu-container" ref={ref}>
      <button className="home-profile-menu-btn" onClick={() => setOpen(!open)}>
        <img src={profileImage} alt="Profile" className="home-profile-avatar" />
        <span className="home-profile-name">{user.name.split(' ')[0]}</span>
      </button>

      {open && (
        <div className="home-dropdown-menu">
          <div className="home-dropdown-header-new">
            <img src={profileImage} alt="Profile" className="home-dropdown-avatar-new" />
            <div className="home-dropdown-user-info">
              <strong>{user.name} {isPremium && <span className="home-pro-badge">PRO</span>}</strong>
              <span title={user.email}>{user.email}</span>
            </div>
          </div>
          
          <div className="home-dropdown-divider"></div>

          <div className="home-dropdown-links">
            <Link to="/profile" onClick={() => setOpen(false)}>My Profile</Link>
            <Link to="/booking-history" onClick={() => setOpen(false)}>My Rentals</Link>
            <Link to="/chat" onClick={() => setOpen(false)}>Messages</Link>
          </div>

          <div className="home-dropdown-divider"></div>

          <div className="home-dropdown-theme-toggle" onClick={toggleTheme}>
            <span>Theme</span>
            <span className="theme-status">{isDark ? 'Dark' : 'Light'}</span>
          </div>

          <div className="home-dropdown-divider"></div>

          <button
            onClick={() => { setOpen(false); logout(); }}
            className="home-dropdown-logout-btn"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function MobileMenu({ open, loggedIn, isPremium, logout, onClose }) {
  if (!open) return null;
  return (
    <div className="home-mobile-menu">
      <Link to="/" onClick={onClose}>Home</Link>
      <Link to="/booking" onClick={onClose}>Explore Rentals</Link>
      {!isPremium && <Link to="/premium" onClick={onClose} style={{ color: '#f59e0b' }}>👑 Go Premium</Link>}
      <Link to="/create-listing" onClick={onClose} style={{ color: 'var(--accent-bright)' }}>+ Post Listing</Link>
      <Link to="/about" onClick={onClose}>About</Link>
      <Link to="/contact" onClick={onClose}>Contact</Link>

      <div className="home-mobile-auth">
        {!loggedIn ? (
          <>
            <Link to="/login" onClick={onClose}>Log In</Link>
            <Link to="/signup" className="btn-nav-primary" onClick={onClose}>Get Started</Link>
          </>
        ) : (
          <>
            <Link to="/profile" onClick={onClose}>My Profile</Link>
            <Link to="/booking-history" onClick={onClose}>My Rentals</Link>
            <button
              onClick={() => { onClose(); logout(); }}
              style={{ background: 'transparent', border: 'none', color: '#ef4444', font: 'inherit', textAlign: 'left', cursor: 'pointer', padding: '10px 0' }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Navbar() {
  const { scrolled, hiddenNav } = useScrollDirection();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  
  const loggedIn = isLoggedIn();
  const user = getAuthUser();
  const isPremium = user ? !!user.isPro : false;
  const profileImage = user?.profileImage || '/assets/profile.png';
  
  const logout = () => {
      clearAuthSession();
      navigate('/login');
  };

  return (
    <>
      <header className={`home-header ${scrolled ? 'scrolled' : ''} ${hiddenNav ? 'hidden-nav' : ''}`}>
        <Link to="/" className="home-logo">
          RENT<span>FLOW</span>
        </Link>

        <nav className="home-nav-links">
          <Link to="/">Home</Link>
          <Link to="/booking" activeclassname="active">Explore Rentals</Link>
          {loggedIn && <Link to="/booking-history">My Rentals</Link>}
          <Link to="/create-listing" style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>+ Post Listing</Link>
          <Link to="/contact">Contact & FAQ</Link>
        </nav>

        <div className="home-nav-cta">
          {!loggedIn ? (
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
        loggedIn={loggedIn}
        isPremium={isPremium}
        logout={logout}
        onClose={() => setMobileOpen(false)}
      />
    </>
  );
}
