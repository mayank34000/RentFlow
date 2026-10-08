import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthUser, clearAuthSession } from './services/api';
import './styles/upcoming-features.css';
import Navbar from './components/Navbar';

export default function UpcomingFeatures() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const [hiddenNav, setHiddenNav] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const currentUser = getAuthUser();
        if (currentUser) {
            setIsLoggedIn(true);
            setUser(currentUser);
        }

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setScrolled(currentScrollY > 50);
            setHiddenNav(currentScrollY > lastScrollY && currentScrollY > 100);
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const handleLogout = () => {
        clearAuthSession();
        setIsLoggedIn(false);
        setUser(null);
        navigate('/');
    };

    return (
        <div className="roadmap-page-wrapper">
            <Navbar />

            <section className="roadmap-hero">
                <div className="hero-badge" style={{ marginBottom: '24px' }}>
                    <span className="badge-dot" style={{ background: '#8b5cf6' }}></span>
                    Product Roadmap
                </div>
                <h1 className="about-hero-title" style={{ fontSize: '3.5rem', marginBottom: '20px' }}>
                    The Future of <span className="logo-inline">Rent<span>Flow</span></span>
                </h1>
                <p className="about-hero-subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    We are constantly evolving to make renting seamless and secure. Here is a sneak peek at the exciting features we are building next.
                </p>
            </section>

            <div className="roadmap-grid">
                <div className="roadmap-card card-1">
                    <div className="status-badge">Planned</div>
                    <div className="roadmap-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                    </div>
                    <h3>OTP Email Login</h3>
                    <p>Passwordless authentication using secure email verification links for faster and safer access.</p>
                </div>

                <div className="roadmap-card card-2">
                    <div className="status-badge">In Progress</div>
                    <div className="roadmap-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <h3>Real-time Chat via Socket.io</h3>
                    <p>Instant messaging between landlords and tenants with read receipts and typing indicators.</p>
                </div>

                <div className="roadmap-card card-3">
                    <div className="status-badge">Design Phase</div>
                    <div className="roadmap-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <h3>Advanced Map Search</h3>
                    <p>Draw custom search areas on the map and filter listings by neighborhood boundaries.</p>
                </div>

                <div className="roadmap-card card-4">
                    <div className="status-badge">Planned</div>
                    <div className="roadmap-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </div>
                    <h3>Digital Lease Signing</h3>
                    <p>Legally binding e-signatures and secure document storage for completely paperless contracts.</p>
                </div>
            </div>

            <footer className="site-footer">
                <div className="footer-inner">
                    <div className="footer-brand">
                        <div className="logo">Rent<span>Flow</span></div>
                        <p>Smart dynamic rental platform.</p>
                    </div>
                    <div className="footer-links">
                        <div className="footer-col">
                            <p className="footer-col-title">Platform</p>
                            <Link to="/">Home</Link>
                            <Link to="/booking">Explore Rentals</Link>
                            <Link to="/create-listing">Post Listing</Link>
                            <Link to="/premium">Pricing</Link>
                        </div>
                        <div className="footer-col">
                            <p className="footer-col-title">User</p>
                            <Link to="/profile">Profile</Link>
                            <Link to="/booking-history">My Rentals</Link>
                        </div>
                        <div className="footer-col">
                            <p className="footer-col-title">Company</p>
                            <Link to="/about">About Us</Link>
                            <Link to="/contact">Contact & FAQ</Link>
                            <Link to="/feedback">Feedback</Link>
                            <Link to="/policy">Privacy Policy</Link>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>©2026 RentFlow. All rights reserved.</p>
                    <p className="footer-tech">Built by Team RentFlow • Secured by Razorpay</p>
                </div>
            </footer>
        </div>
    );
}
