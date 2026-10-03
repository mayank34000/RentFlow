import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './styles/tokens.css';
import './styles/home.css';

// ============================================================================
// 1. STATIC DATA CONSTANTS
// ============================================================================

const CATEGORIES_DATA = [
  'Vehicles',
  'Electronics',
  'Fashion',
  'Tools',
  'Property',
  'Sports',
];

const CITIES_DATA = [
  'Mumbai',
  'Delhi NCR',
  'Bangalore',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Chandigarh',
  'Kochi',
  'Goa',
];

const SHOWCASE_ITEMS = [
  {
    id: 'vehicles',
    name: 'Vehicles',
    tagline: 'Bikes, SUVs & Luxury Cars',
    video: '/assets/vehicles-video.mp4',
    fallbackVideo: './assets/vehicles-video.mp4',
    accentColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
  {
    id: 'electronics',
    name: 'Electronics',
    tagline: 'MacBooks, Consoles & Devices',
    video: '/assets/electronics-video.mp4',
    fallbackVideo: './assets/electronics-video.mp4',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
  {
    id: 'fashion',
    name: 'Fashion',
    tagline: 'Designer Suits, Watches & Wear',
    video: '/assets/fashion-video.mp4',
    fallbackVideo: './assets/fashion-video.mp4',
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
  {
    id: 'tools',
    name: 'Tools',
    tagline: 'Drills & Power Equipment',
    video: '/assets/tools-video.mp4',
    fallbackVideo: './assets/tools-video.mp4',
    accentColor: '#84cc16',
    glowColor: 'rgba(132, 204, 22, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(132, 204, 22, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
  {
    id: 'property',
    name: 'Property',
    tagline: 'Studios, Apartments & Venues',
    video: '/assets/property-video.mp4',
    fallbackVideo: './assets/property-video.mp4',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
  {
    id: 'sports',
    name: 'Sports',
    tagline: 'Cycles, Golf & Fitness Gear',
    video: '/assets/sports-video.mp4',
    fallbackVideo: './assets/sports-video.mp4',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    bgGradient: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(5, 10, 24, 0.95) 75%)',
  },
];

const FEATURES_DATA = [
  {
    id: 'f1',
    title: 'Smart Location Search',
    text: 'Filter thousands of listings by location, radius, and availability for immediate pickup or delivery.',
    iconType: 'search',
    accentColor: '#3b82f6',
    isPro: false,
  },
  {
    id: 'f2',
    title: 'Verified Providers',
    text: 'Trust every transaction with ID-verified providers, community ratings, and historical performance.',
    iconType: 'shield',
    accentColor: '#10b981',
    isPro: false,
  },
  {
    id: 'f3',
    title: 'Contact Unlock (PRO)',
    text: 'Connect directly with owners via phone and WhatsApp with zero intermediary hold-ups.',
    iconType: 'lock',
    accentColor: '#f59e0b',
    isPro: true,
  },
  {
    id: 'f4',
    title: 'Real-Time Bookings',
    text: 'Monitor active, pending, and past bookings from an intuitive dashboard with instant status updates.',
    iconType: 'activity',
    accentColor: '#8b5cf6',
    isPro: false,
  },
  {
    id: 'f5',
    title: 'Instant Scheduling',
    text: 'Pick exact pickup and drop-off dates with automated daily and half-day duration calculations.',
    iconType: 'calendar',
    accentColor: '#06b6d4',
    isPro: false,
  },
  {
    id: 'f6',
    title: 'Multi-Role Ecosystem',
    text: 'Easily transition between renter and lender personas with dedicated dashboards and analytics.',
    iconType: 'users',
    accentColor: '#ec4899',
    isPro: false,
  },
];

const STEPS_DATA = [
  {
    num: '01',
    title: 'Search & Filter',
    text: 'Browse hundreds of listings across 6 categories. Filter by location, price, and rental duration.',
  },
  {
    num: '02',
    title: 'Unlock Contact',
    text: 'Connect directly with verified lenders. Ask questions, confirm condition, and finalize rental terms.',
    badge: 'PRO ACCESS',
  },
  {
    num: '03',
    title: 'Book & Pay',
    text: 'Secure your item with transparent pricing, security deposit safeguards, and Razorpay-secured payments.',
  },
];

const TESTIMONIALS_DATA = [
  {
    id: 't1',
    name: 'Aarav Sharma',
    location: 'Mumbai, Maharashtra',
    text: 'RentFlow solved our weekend road trip perfectly. Found a verified Thar in 10 minutes with transparent pricing and zero hidden fees.',
    stars: '★★★★★',
    initial: 'A',
    bg: '#2563eb',
  },
  {
    id: 't2',
    name: 'Priya Patel',
    location: 'Bangalore, Karnataka',
    text: 'Renting out my mirrorless camera on RentFlow pays for all my equipment upgrades. The ID verification gives me complete peace of mind.',
    stars: '★★★★★',
    initial: 'P',
    bg: '#10b981',
  },
  {
    id: 't3',
    name: 'Rohan Verma',
    location: 'Delhi NCR',
    text: 'As an event organizer, finding commercial audio gear on short notice used to be painful. RentFlow has become our go-to partner.',
    stars: '★★★★★',
    initial: 'R',
    bg: '#f59e0b',
  },
];

const FOOTER_LINKS_DATA = {
  platform: [
    { label: 'Home', href: '/' },
    { label: 'Explore Rentals', href: '/booking' },
    { label: 'Post Listing', href: '/create-listing' },
    { label: 'Pricing', href: '/premium' },
  ],
  user: [
    { label: 'Profile', href: '/profile' },
    { label: 'My Rentals', href: '/booking-history' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Upcoming Features', href: '/upcoming-features' },
    { label: 'Contact & FAQ', href: '/contact' },
    { label: 'Feedback', href: '/feedback' },
    { label: 'Privacy Policy', href: '/policy' },
  ],
};

// ============================================================================
// 2. HELPER FUNCTIONS & HOOKS
// ============================================================================

function handleNavClick(e, targetPath) {
  if (!targetPath) return;
  if (targetPath.startsWith('#')) {
    const el = document.querySelector(targetPath);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function useAuth() {
  const [authState, setAuthState] = useState(() => {
    try {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const currentUser = JSON.parse(localStorage.getItem('current_user'));
      const profileImage = localStorage.getItem('profileImage') || '/assets/profile.png';
      return {
        isLoggedIn: isLoggedIn && !!currentUser,
        user: currentUser || null,
        profileImage,
        isPremium: currentUser ? !!currentUser.isPremium : false,
      };
    } catch {
      return { isLoggedIn: false, user: null, profileImage: '/assets/profile.png', isPremium: false };
    }
  });

  useEffect(() => {
    if (authState.isLoggedIn && authState.user && authState.isPremium && authState.user.premiumExpiryDate) {
      const expiry = new Date(authState.user.premiumExpiryDate);
      if (new Date() > expiry) {
        const updatedUser = { ...authState.user, isPremium: false };
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
        try {
          let allUsers = JSON.parse(localStorage.getItem('user')) || [];
          const idx = allUsers.findIndex(u => u.useremail === updatedUser.useremail);
          if (idx !== -1) {
            allUsers[idx].isPremium = false;
            localStorage.setItem('user', JSON.stringify(allUsers));
          }
        } catch {}
        setAuthState(prev => ({ ...prev, user: updatedUser, isPremium: false }));
      }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('current_user');
    localStorage.removeItem('profileImage');
    window.location.reload();
  };

  return { ...authState, logout };
}

function useScrollDirection() {
  const [scrollState, setScrollState] = useState({ scrolled: false, hiddenNav: false });
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
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

// ============================================================================
// 3. SUBCOMPONENTS
// ============================================================================

function IntroRReveal() {
  const [stage, setStage] = useState('active');

  useEffect(() => {
    const t1 = setTimeout(() => setStage('zooming'), 150);
    const t2 = setTimeout(() => setStage('hidden'), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
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

function ProfileDropdown({ user, profileImage, isPremium, logout }) {
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
          <polyline points="6 9 12 15 18 9" />
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

function MobileMenu({ open, isLoggedIn, isPremium, logout, onClose }) {
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

function Navbar({ auth }) {
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

function HeroCircleFeatureMix() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [converged, setConverged] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setConverged(true), 150);
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURES_DATA.length);
    }, 3800);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  const current = FEATURES_DATA[activeFeature];

  return (
    <div className="home-hero-r-mix-container">
      <div className="home-r-circle-wrap">
        <svg className="home-r-svg-ring" viewBox="0 0 580 580">
          <circle cx="290" cy="290" r="235" className="home-r-ring-bg" />
          <circle
            cx="290"
            cy="290"
            r="235"
            className="home-r-ring-active"
            style={{
              stroke: current.accentColor || '#3b82f6',
              strokeDasharray: '1476',
              strokeDashoffset: 1476 - (1476 / FEATURES_DATA.length) * (activeFeature + 1),
              filter: `drop-shadow(0 0 16px ${current.accentColor || '#3b82f6'})`,
            }}
          />
        </svg>

        <div className="home-r-pulse-glow" style={{ borderColor: current.accentColor }} />

        <div className="home-r-core">
          <div className="home-r-letter">R</div>
          <div className="home-r-feature-info" key={current.id}>
            <span className="home-r-badge" style={{ color: current.accentColor }}>
              {current.title}
            </span>
            <p className="home-r-text">{current.text}</p>
          </div>
        </div>

        <div className={`home-r-nodes-orbit ${converged ? 'converged' : 'scattered'}`}>
          {FEATURES_DATA.map((feat, idx) => {
            const angle = (idx / FEATURES_DATA.length) * 360 - 90;
            const radius = 250;
            const scatterRadius = 450;
            const targetX = radius * Math.cos((angle * Math.PI) / 180);
            const targetY = radius * Math.sin((angle * Math.PI) / 180);
            const scatteredX = scatterRadius * Math.cos((angle * Math.PI) / 180);
            const scatteredY = scatterRadius * Math.sin((angle * Math.PI) / 180);
            const posX = converged ? targetX : scatteredX;
            const posY = converged ? targetY : scatteredY;
            const isActive = idx === activeFeature;

            return (
              <div
                key={feat.id}
                className={`home-r-node ${isActive ? 'active' : ''}`}
                style={{
                  transform: `translate(calc(${posX}px - 50%), calc(${posY}px - 50%)) scale(${converged ? (isActive ? 1.08 : 1) : 0.4})`,
                  opacity: converged ? 1 : 0,
                  transitionDelay: `${idx * 0.12}s`,
                }}
                onClick={() => setActiveFeature(idx)}
                onMouseEnter={() => setActiveFeature(idx)}
              >
                <div
                  className="home-r-node-pill"
                  style={{
                    borderColor: isActive ? feat.accentColor : 'var(--border)',
                    boxShadow: isActive ? `0 0 24px ${feat.accentColor}80` : '0 10px 25px rgba(0,0,0,0.4)',
                  }}
                >
                  <span className="home-r-node-dot" style={{ background: feat.accentColor }} />
                  <span className="home-r-node-label">{feat.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Hero({ isLoggedIn }) {
  return (
    <section className="home-hero home-hero-centered" id="hero">
      <div className="home-hero-brand-tag">RENTFLOW</div>

      <h1 className="home-hero-title">
        The smartest direct<br />
        <em>rental &amp; booking</em> platform
      </h1>

      <p className="home-hero-subtitle">
        Find, compare, and book verified listings directly from asset owners with complete pricing transparency, verified provider contacts, and zero middleman delay.
      </p>

      <HeroCircleFeatureMix />

      <div className="home-hero-actions">
        {!isLoggedIn && (
          <Link to="/signup" className="home-btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Start for Free
          </Link>
        )}
        <a href="#how-it-works" className="home-btn-secondary" onClick={(e) => handleNavClick(e, '#how-it-works')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" />
          </svg>
          See How it Works
        </a>
      </div>
    </section>
  );
}

function OmniCircleShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SHOWCASE_ITEMS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const activeItem = SHOWCASE_ITEMS[activeIndex];

  return (
    <section className="home-section home-omni-circle-section" id="categories">
      <div className="home-circle-container">
        <div className="home-omni-header" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <span className="home-dot-eyebrow">• RENTAL CATEGORIES</span>
          <h2 className="home-section-title">Explore Verified Rentals by Category</h2>
        </div>

        <div className="home-o-ring-wrapper">
          <div className="home-o-ring-graphic">
            <svg className="home-o-svg" viewBox="0 0 500 500">
              <circle cx="250" cy="250" r="220" className="home-o-bg-circle" />
              <circle
                cx="250"
                cy="250"
                r="220"
                className="home-o-active-arc"
                style={{
                  stroke: activeItem.accentColor,
                  strokeDasharray: '1382',
                  strokeDashoffset: 1382 - (1382 / SHOWCASE_ITEMS.length) * (activeIndex + 1),
                  filter: `drop-shadow(0 0 16px ${activeItem.accentColor})`,
                }}
              />
            </svg>

            <div className="home-o-center-content" style={{ background: activeItem.bgGradient }}>
              <video
                key={activeItem.id}
                autoPlay
                muted
                loop
                playsInline
                className="home-o-image-fade"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  pointerEvents: 'none',
                }}
                ref={(el) => {
                  if (el) {
                    el.muted = true;
                    el.volume = 0;
                    el.play().catch(() => {});
                  }
                }}
              >
                <source src={activeItem.video} type="video/mp4" />
                <source src={activeItem.fallbackVideo} type="video/mp4" />
              </video>
              <div className="home-o-center-caption">
                <span className="home-o-badge" style={{ color: activeItem.accentColor }}>
                  {activeItem.name}
                </span>
              </div>
            </div>
          </div>

          <div className="home-o-nodes-wrap">
            {SHOWCASE_ITEMS.map((item, idx) => {
              const angle = (idx / SHOWCASE_ITEMS.length) * 360 - 90;
              const radius = 250;
              const x = radius * Math.cos((angle * Math.PI) / 180);
              const y = radius * Math.sin((angle * Math.PI) / 180);
              const isActive = idx === activeIndex;

              return (
                <div
                  key={item.id}
                  className={`home-o-node ${isActive ? 'active' : ''}`}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  onClick={() => setActiveIndex(idx)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <div
                    className="home-o-node-inner"
                    style={{
                      borderColor: isActive ? item.accentColor : 'var(--border)',
                      boxShadow: isActive ? `0 0 24px ${item.glowColor}` : '0 10px 25px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <span className="home-o-node-num" style={{ color: item.accentColor }}>0{idx + 1}</span>
                    <span className="home-o-node-title">{item.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="home-o-controls">
          <div className="home-o-pill-tabs">
            {SHOWCASE_ITEMS.map((item, idx) => (
              <button
                key={item.id}
                className={`home-o-pill-tab ${idx === activeIndex ? 'active' : ''}`}
                style={{
                  background: idx === activeIndex ? item.accentColor : undefined,
                  borderColor: idx === activeIndex ? item.accentColor : undefined,
                  boxShadow: idx === activeIndex ? `0 4px 20px ${item.glowColor}` : undefined,
                }}
                onClick={() => setActiveIndex(idx)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CitiesMarquee() {
  return (
    <div className="home-marquee-wrap">
      <div className="home-marquee-label">Trusted by users across top cities</div>
      <div className="home-marquee-track">
        <div className="home-marquee-group">
          {CITIES_DATA.map((city, idx) => (
            <React.Fragment key={`c1-${idx}`}>
              <span>{city}</span>
              <span className="dot">•</span>
            </React.Fragment>
          ))}
        </div>
        <div className="home-marquee-group" aria-hidden="true">
          {CITIES_DATA.map((city, idx) => (
            <React.Fragment key={`c2-${idx}`}>
              <span>{city}</span>
              <span className="dot">•</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function SplitFeature() {
  const handleImgError = (e) => {
    if (e.target.src.includes('/assets/')) {
      e.target.src = './assets/split-feature-clean.jpg';
    } else {
      e.target.src = '/assets/split-feature-clean.jpg';
    }
  };

  return (
    <section className="home-section">
      <div className="home-split-header">
        <span className="home-dot-eyebrow">• Connected Capabilities</span>
        <h2 className="home-section-title">A competitive edge across every rental category</h2>
      </div>

      <div className="home-split">
        <div className="home-split-image-wrap">
          <img
            src="/assets/split-feature-clean.jpg"
            alt="Browse RentFlow Rentals"
            onError={handleImgError}
          />
        </div>
        <div className="home-split-content">
          <p className="home-section-subtitle" style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>
            RentFlow bridges asset owners and renters seamlessly. Explore verified listings, compare daily or monthly pricing, and connect directly with verified owners without platform gatekeeping.
          </p>
          <Link to="/booking" className="home-split-link">
            Explore Rentals
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }) {
  const { title, text, iconType, accentColor, isPro } = feature;

  const renderIcon = () => {
    switch (iconType) {
      case 'search':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
        );
      case 'shield':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case 'lock':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
      case 'activity':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        );
      case 'calendar':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case 'users':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="home-card">
      <div className="home-card-icon" style={{ background: `${accentColor}15` }}>
        {renderIcon()}
      </div>
      <h3 className="home-card-title">
        {title}
        {isPro && <span className="home-badge-pro">PRO</span>}
      </h3>
      <p className="home-card-text">{text}</p>
      <div className="home-card-arrow-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
        </svg>
      </div>
    </div>
  );
}

function FeatureGrid() {
  return (
    <section className="home-section" id="features">
      <div className="home-omni-header">
        <span className="home-dot-eyebrow" style={{ display: 'block', marginBottom: '0.8rem' }}>• PLATFORM ADVANTAGES</span>
        <div className="home-omni-badge">
          <span>RENTFLOW</span>
          <span className="plus">+</span>
        </div>
        <h2 className="home-section-title" style={{ maxWidth: '800px' }}>
          One unified workflow for search, contact &amp; bookings
        </h2>
      </div>

      <div className="home-grid">
        {FEATURES_DATA.map(feature => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="home-section" id="how-it-works">
      <div className="home-section-header">
        <p className="home-eyebrow">THE PROCESS</p>
        <h2 className="home-section-title">Rent in 3 simple steps</h2>
        <p className="home-section-subtitle">Follow these simple steps to find, unlock, and secure your next rental.</p>
      </div>
      <div className="home-steps">
        {STEPS_DATA.map(step => (
          <div key={step.num} className="home-step-card">
            <div className="home-step-num">{step.num}</div>
            <h3 className="home-step-title">{step.title}</h3>
            <p className="home-step-text">{step.text}</p>
            {step.badge && (
              <span className="home-step-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {step.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="home-section" id="testimonials">
      <div className="home-whats-new-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <span className="home-dot-eyebrow">• LATEST NEWS &amp; REVIEWS</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="home-section-title" style={{ margin: 0 }}>What's new across RentFlow</h2>
          <Link to="/upcoming-features" className="home-view-all-btn">
            View All
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="home-testimonials-grid">
        {TESTIMONIALS_DATA.map(item => (
          <div key={item.id} className="home-news-card">
            <div>
              <p className="home-news-date">SEPTEMBER 28, 2026</p>
              <h3 className="home-news-title">{item.text}</h3>
            </div>
            <div className="home-news-footer">
              <div className="home-news-author">
                <div className="home-author-avatar" style={{ background: item.bg, color: '#ffffff' }}>
                  {item.initial}
                </div>
                <div>
                  <div className="home-author-name">{item.name}</div>
                  <div className="home-author-location">{item.location}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UpcomingTeaser() {
  return (
    <section className="home-section" style={{ paddingTop: 0 }}>
      <Link
        to="/upcoming-features"
        className="home-teaser-card"
        style={{ display: 'block', textDecoration: 'none', cursor: 'pointer' }}
      >
        <p className="home-eyebrow" style={{ color: '#60a5fa', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.8rem' }}>• THE FUTURE</p>
        <h2 className="home-section-title" style={{ marginBottom: '1rem', color: '#ffffff' }}>
          Exciting New Features Are Coming
        </h2>
        <p style={{ margin: '0 auto 2rem', fontSize: '1.05rem', color: '#cbd5e1', maxWidth: '680px', lineHeight: 1.6 }}>
          We are continuously pushing the boundaries of what a rental platform can be. Click here to get a sneak peek at what we're building next.
        </p>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '1rem',
          background: 'var(--accent-blue)',
          padding: '12px 28px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
        }}>
          View Upcoming Features
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </section>
  );
}

function Footer() {
  return (
    <footer className="home-footer">
      <div className="home-footer-inner">
        <div className="home-footer-brand">
          <Link to="/" className="home-logo">
            Rent<span>Flow</span>
          </Link>
          <p>Smart dynamic rental platform.</p>
        </div>

        <div className="home-footer-links">
          <div className="home-footer-col">
            <p className="home-footer-col-title">Platform</p>
            {FOOTER_LINKS_DATA.platform.map(link => (
              <Link key={link.label} to={link.href}>{link.label}</Link>
            ))}
          </div>

          <div className="home-footer-col">
            <p className="home-footer-col-title">User</p>
            {FOOTER_LINKS_DATA.user.map(link => (
              <Link key={link.label} to={link.href}>{link.label}</Link>
            ))}
          </div>

          <div className="home-footer-col">
            <p className="home-footer-col-title">Company</p>
            {FOOTER_LINKS_DATA.company.map(link => (
              <Link key={link.label} to={link.href}>{link.label}</Link>
            ))}
          </div>
        </div>
      </div>

      <div className="home-footer-bottom">
        <p>©2026 RentFlow. All rights reserved.</p>
        <p>Built by Team RentFlow · Secured by Razorpay</p>
      </div>
    </footer>
  );
}

// ============================================================================
// 4. MAIN HOMEPAGE COMPONENT (DEFAULT EXPORT)
// ============================================================================

export default function HomePage() {
  const auth = useAuth();

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
