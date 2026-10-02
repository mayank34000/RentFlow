import React from 'react';
import { footerLinksData } from '../data/footerLinks';
import { handleNavClick } from '../utils/navigation';

export function Footer() {
  return (
    <footer className="home-footer">
      <div className="home-footer-inner">
        <div className="home-footer-brand">
          <a href="index.html" className="home-logo" onClick={(e) => handleNavClick(e, 'index.html')}>
            Rent<span>Flow</span>
          </a>
          <p>Smart dynamic rental platform.</p>
        </div>

        <div className="home-footer-links">
          <div className="home-footer-col">
            <p className="home-footer-col-title">Platform</p>
            {footerLinksData.platform.map(link => (
              <a key={link.label} href={link.href} onClick={(e) => handleNavClick(e, link.href)}>{link.label}</a>
            ))}
          </div>

          <div className="home-footer-col">
            <p className="home-footer-col-title">User</p>
            {footerLinksData.user.map(link => (
              <a key={link.label} href={link.href} onClick={(e) => handleNavClick(e, link.href)}>{link.label}</a>
            ))}
          </div>

          <div className="home-footer-col">
            <p className="home-footer-col-title">Company</p>
            {footerLinksData.company.map(link => (
              <a key={link.label} href={link.href} onClick={(e) => handleNavClick(e, link.href)}>{link.label}</a>
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
