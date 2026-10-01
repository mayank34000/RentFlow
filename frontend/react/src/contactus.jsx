import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../css/index.css';
import './styles/contactus.css';

export default function ContactUs() {
    const [scrollState, setScrollState] = useState({ hidden: false, scrolled: false });
    const [openFaq, setOpenFaq] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toasts, setToasts] = useState([]);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        // Theme initialization
        const savedTheme = localStorage.getItem("theme") || "dark";
        if (savedTheme === "light") {
            document.body.classList.add("light-theme");
        } else {
            document.body.classList.remove("light-theme");
        }

        // Auth initialization
        const loggedIn = localStorage.getItem("isLoggedIn") === "true";
        setIsLoggedIn(loggedIn);
        if (loggedIn) {
            const user = JSON.parse(localStorage.getItem("current_user")) || {};
            setCurrentUser(user);
        }

        // Scroll listener for navbar
        let lastScrollTop = window.scrollY || document.documentElement.scrollTop;
        const handleScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            let hidden = scrollState.hidden;
            let scrolled = scrollState.scrolled;

            if (scrollTop > lastScrollTop && scrollTop > 80) {
                hidden = true;
            } else {
                hidden = false;
            }

            if (scrollTop > 50) {
                scrolled = true;
            } else {
                scrolled = false;
            }

            setScrollState(prev => {
                if (prev.hidden !== hidden || prev.scrolled !== scrolled) {
                    return { hidden, scrolled };
                }
                return prev;
            });
            lastScrollTop = scrollTop;
        };

        window.addEventListener("scroll", handleScroll);

        // Load legacy wallet script since it's massive and shared.
        // We do this so window.openWalletModal is available.
        // TODO: replace with Mayank's shared React Navbar when available.
        if (!document.getElementById("legacy-navbar-script")) {
            const script = document.createElement("script");
            script.id = "legacy-navbar-script";
            script.src = "../../js/navbar-scroll.js";
            document.body.appendChild(script);
        }

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const showToast = (msg, type = "success") => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message: msg, type, show: false }]);

        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, show: true } : t));
        }, 10);

        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, show: false } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 400);
        }, 3000);
    };

    const handleContactSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
            showToast("Please fill in all fields.", "error");
            return;
        }

        setIsSubmitting(true);

        new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.05) {
                    resolve("Message sent successfully");
                } else {
                    reject(new Error("Network Error"));
                }
            }, 1500);
        })
        .then(() => {
            showToast("Your message has been sent. We'll be in touch soon!");
            setName('');
            setEmail('');
            setSubject('');
            setMessage('');
            setShowModal(false);
        })
        .catch((error) => {
            showToast("Failed to send message. Please try again later.", "error");
            console.error("Contact Form Error:", error);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
    };

    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("current_user");
        setIsLoggedIn(false);
        setCurrentUser(null);
        navigate(0); // reload
    };

    const firstName = currentUser?.username ? currentUser.username.split(" ")[0] : "User";
    const savedImage = currentUser ? (localStorage.getItem(`profile_image_${currentUser.useremail}`) || "https://ui-avatars.com/api/?name=" + firstName + "&background=3b82f6&color=fff") : "";
    const premiumText = currentUser?.isPremium ? "Pro Member" : "Upgrade to Pro";

    const faqs = [
        {q: "How is the security deposit handled?", a: "RentFlow holds the 10% security deposit in escrow during your rental period. It is fully refunded to your original payment method within 3-5 business days after the item is returned in its original condition."},
        {q: "What happens if I damage a rented item?", a: "If an item is damaged, the repair costs will first be deducted from your security deposit. If the cost exceeds the deposit, RentFlow Support will mediate between you and the lender to resolve the issue based on the item's depreciated value."},
        {q: "How do I contact the lender?", a: "You can use our in-app chat feature to speak directly with the lender before and during your rental. If you upgrade to RentFlow Pro, you instantly unlock phone numbers for direct calling."},
        {q: "Is there a platform commission fee?", a: "For renters, there are NO platform fees. You only pay the rental rate and the refundable security deposit. For lenders (owners), RentFlow charges a flat 2% commission on the total rental earnings upon successful completion."}
    ];

    return (
        <>
            <video className="bg-video" autoPlay muted loop playsInline>
                <source src="../../assets/video.mp4" type="video/mp4" />
            </video>
            <div className="overlay"></div>

            <div className="page-wrapper" onClick={() => setShowProfileMenu(false)}>
                <header className={`site-header ${scrollState.hidden ? 'hidden-nav' : ''} ${scrollState.scrolled ? 'scrolled' : ''}`} id="site-header">
                    <Link to="/" className="logo">Rent<span style={{color: '#3a5bd9'}}>Flow</span></Link>
                    <nav className="nav-links" id="main-nav">
                        <Link to="/">Home</Link>
                        <Link to="/booking">Explore Rentals</Link>
                        <Link to="/booking-history">My Rentals</Link>
                        <Link to="/create-listing" style={{color: '#3b82f6', fontWeight: 600}}>+ Post Listing</Link>
                        <Link to="/about">About</Link>
                    </nav>
                    <div className="nav-cta" id="auth-buttons">
                        {!isLoggedIn ? (
                            <>
                                <Link to="/login" className="btn-ghost">Log In</Link>
                                <Link to="/signup" className="btn-nav-primary">Get Started</Link>
                            </>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <div
                                    className="profile-dropdown-trigger"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                                    onClick={(e) => { e.stopPropagation(); setShowProfileMenu(prev => !prev); }}
                                >
                                    <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <img src={savedImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: '#fff' }}>{firstName}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '2px' }}><polyline points="6 9 12 15 18 9"/></svg>
                                </div>

                                <div
                                    className="profile-dropdown-menu"
                                    style={{ display: showProfileMenu ? 'flex' : 'none', position: 'absolute', top: '40px', right: 0, background: '#12172b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', width: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, padding: '6px 0', flexDirection: 'column' }}
                                >
                                    <Link to="/profile" style={{ padding: '10px 16px', color: '#b0b8c6', textDecoration: 'none', fontSize: '14px', fontWeight: 500, display: 'block' }}>My Profile</Link>
                                    <a href="#" onClick={(e) => { e.preventDefault(); setShowProfileMenu(false); if(window.openWalletModal) window.openWalletModal(); }} style={{ padding: '10px 16px', color: '#b0b8c6', textDecoration: 'none', fontSize: '14px', fontWeight: 500, display: 'block' }}>My Wallet</a>
                                    <Link to="/premium" style={{ padding: '10px 16px', color: '#eab308', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'block', whiteSpace: 'nowrap' }}>👑 {premiumText}</Link>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '6px 0' }}></div>
                                    <a href="#" onClick={handleLogout} style={{ padding: '10px 16px', color: '#ef4444', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'block' }}>Logout</a>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <main className="main-content">
                    <div className="text-center">
                        <h1 className="page-title">How can we help?</h1>
                        <p className="page-subtitle">Whether you have a question about features, pricing, or anything else, our team is ready to answer all your questions.</p>
                    </div>

                    <div className="contact-options">
                        <div className="contact-card" onClick={() => setShowModal(true)}>
                            <div className="contact-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </div>
                            <h3>Email Support</h3>
                            <p>Send us an email and we'll reply within 24 hours.</p>
                        </div>

                        <div className="contact-card" onClick={() => window.open('tel:+9118001234567')}>
                            <div className="contact-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </div>
                            <h3>Call Us</h3>
                            <p>Available Mon-Fri, 9am to 6pm IST.</p>
                        </div>
                    </div>

                    <div className="faq-section">
                        <h2 className="faq-title">Frequently Asked Questions</h2>
                        <div className="accordion">
                            {faqs.map((faq, idx) => (
                                <div key={idx} className={`accordion-item ${openFaq === idx ? 'active' : ''}`}>
                                    <button className="accordion-header" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                                        {faq.q}
                                        <svg className="accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    </button>
                                    <div className="accordion-content">
                                        <div className="accordion-content-inner">
                                            {faq.a}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            <div className={`modal-backdrop ${showModal ? 'show' : ''}`} id="contact-modal" onClick={(e) => { if (e.target.id === 'contact-modal') setShowModal(false); }}>
                <div className="modal-card">
                    <button className="modal-close" onClick={() => setShowModal(false)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <h3 className="modal-title">Send us a message</h3>

                    <form onSubmit={handleContactSubmit}>
                        <div className="form-group">
                            <label>Your Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john@example.com" />
                        </div>
                        <div className="form-group">
                            <label>Subject</label>
                            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required placeholder="How can we help?" />
                        </div>
                        <div className="form-group">
                            <label>Message</label>
                            <textarea rows="4" value={message} onChange={e => setMessage(e.target.value)} required placeholder="Type your message here..."></textarea>
                        </div>

                        <button type="submit" className="btn-primary-full" disabled={isSubmitting}>
                            {isSubmitting ? "Sending..." : "Send Message"}
                        </button>
                    </form>
                </div>
            </div>

            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast ${toast.show ? 'show' : ''}`}>
                        {toast.type === 'success'
                            ? <svg className="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            : <svg className="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        }
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
        </>
    );
}
