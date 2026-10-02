import React from 'react';
import { Link } from 'react-router-dom';
import { footerLinksData } from '../../data/footerLinks';

export function Footer() {
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
            {footerLinksData.platform.map(link => (
              <Link key={link.label} to={link.href}>{link.label}</Link>
            ))}
          </div>

          <div className="home-footer-col">
            <p className="home-footer-col-title">User</p>
            {footerLinksData.user.map(link => (
              <Link key={link.label} to={link.href}>{link.label}</Link>
            ))}
          </div>

          <div className="home-footer-col">
            <p className="home-footer-col-title">Company</p>
            {footerLinksData.company.map(link => (
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
