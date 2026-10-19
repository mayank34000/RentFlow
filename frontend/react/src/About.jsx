import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthUser, clearAuthSession } from './services/api';
import './styles/about.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function About() {
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
            if (currentScrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }

            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setHiddenNav(true);
            } else {
                setHiddenNav(false);
            }
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
        <>
            <video className="about-bg-video" autoPlay muted loop playsInline>
                <source src="/assets/video.mp4" type="video/mp4" />
            </video>
            <div className="about-overlay"></div>

            <Navbar />

            <div className="about-page-wrapper">
                <section className="about-hero-section">
                    <h1 className="about-hero-title">Built by people who<br />believe renting can be better.</h1>
                    <p className="about-hero-subtitle">We're a passionate team of builders, designers, and real estate enthusiasts reimagining how people find and manage their homes.</p>
                </section>

                <section className="about-mission-section">
                    <div className="about-mission-card">
                        <div className="about-mission-icon">dYZ_</div>
                        <h3>Our Mission</h3>
                        <p>To make the renting experience seamless, transparent and stress-free — for every landlord and every tenant.</p>
                    </div>
                    <div className="about-mission-card">
                        <div className="about-mission-icon">dY'</div>
                        <h3>Our Vision</h3>
                        <p>A world where anyone can find their perfect home with trust, speed and zero paperwork chaos.</p>
                    </div>
                    <div className="about-mission-card">
                        <div className="about-mission-icon">dY ?</div>
                        <h3>Our Values</h3>
                        <p>We believe in transparency, community and building technology that actually works for real people.</p>
                    </div>
                </section>

                <section className="about-team-section">
                    <p className="about-section-eyebrow">THE TEAM</p>
                    <h2 className="about-section-title">The people behind Rent<span style={{ color: 'var(--primary-orange)' }}>Flow</span></h2>
                    <p className="about-section-subtitle">A small team with big dreams — and a shared obsession with making renting not suck.</p>

                    <div className="about-team-grid">
                        <div className="about-team-card">
                            <div className="about-member-info">
                                <h3 className="about-member-name">Dhruv</h3>
                                <p className="about-member-role">Auth &amp; User Experience</p>
                                <p className="about-member-bio">Crafted the Login, Signup and Profile flows — ensuring every user's first interaction with RentFlow feels smooth and secure.</p>
                                <p className="about-member-email">dhruvkaushik683@gmail.com</p>
                            </div>
                        </div>

                        <div className="about-team-card">
                            <div className="about-member-info">
                                <h3 className="about-member-name">Aryan</h3>
                                <p className="about-member-role">Bookings &amp; Support</p>
                                <p className="about-member-bio">Built the Booking, Booking History, and Contact Us pages, along with the Wallet and Razorpay payment integration — making it effortless for tenants to manage their rentals and get help securely.</p>
                                <p className="about-member-email">aryanaharit14@gmail.com</p>
                            </div>
                        </div>

                        <div className="about-team-card">
                            <div className="about-member-info">
                                <h3 className="about-member-name">Mayank</h3>
                                <p className="about-member-role">Admin &amp; Analytics</p>
                                <p className="about-member-bio">Designed the Admin Dashboard, Analytics and Feedback modules — giving platform owners the visibility and control they need to run things right.</p>
                                <p className="about-member-email">mayankjindal777@gmail.com</p>
                            </div>
                        </div>

                        <div className="about-team-card">
                            <div className="about-member-info">
                                <h3 className="about-member-name">Madhav</h3>
                                <p className="about-member-role">Listings &amp; Discovery</p>
                                <p className="about-member-bio">Owns the Homepage, Create Listing, Edit Listing, About Us, Privacy Policy, and built the Premium feature for RentFlow — building the heart of the platform where lenders post and renters discover their next thing to rent.</p>
                                <p className="about-member-email">madhvtaneja@gmail.com</p>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </>
    );
}
