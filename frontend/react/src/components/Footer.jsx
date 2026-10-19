import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/footer.css';

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

export default function Footer() {
    return (
        <footer className="rf-footer">
            <div className="rf-footer-inner">
                <div className="rf-footer-brand">
                    <Link to="/" className="rf-footer-logo">
                        Rent<span>Flow</span>
                    </Link>
                    <p className="rf-footer-tagline">Smart dynamic rental platform.</p>
                </div>

                <div className="rf-footer-links">
                    <div className="rf-footer-col">
                        <p className="rf-footer-col-title">Platform</p>
                        {FOOTER_LINKS_DATA.platform.map(link => (
                            <Link key={link.label} to={link.href}>{link.label}</Link>
                        ))}
                    </div>

                    <div className="rf-footer-col">
                        <p className="rf-footer-col-title">User</p>
                        {FOOTER_LINKS_DATA.user.map(link => (
                            <Link key={link.label} to={link.href}>{link.label}</Link>
                        ))}
                    </div>

                    <div className="rf-footer-col">
                        <p className="rf-footer-col-title">Company</p>
                        {FOOTER_LINKS_DATA.company.map(link => (
                            <Link key={link.label} to={link.href}>{link.label}</Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="rf-footer-bottom">
                <p>©2026 RentFlow. All rights reserved.</p>
                <p className="rf-footer-tech">Built by Team RentFlow · Secured by Razorpay</p>
            </div>
        </footer>
    );
}
