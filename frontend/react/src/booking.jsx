import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme, useScrollHide } from './useNavbarBehavior';
import '../../css/index.css';
import './styles/booking.css';
import productsData from '../../js/products.json';

// ============================================================================
// CALCULATE BOOKING (Pure Function)
// ============================================================================
// BEGIN calculateBooking
export function calculateBooking(listing, start, end) {
    if (!start || !end || start.getTime() >= end.getTime()) {
        return { hours: 0, days: 0, chargedDays: 0, description: '', subtotal: 0, deposit: 0, total: 0 };
    }

    // Duration Logic (~722-760)
    const diffMs = end.getTime() - start.getTime();
    const totalHours = diffMs / (1000 * 60 * 60);
    const fullDays = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    let chargedDays = 0;
    if (fullDays === 0) {
        chargedDays = remainingHours < 12 ? 0.5 : 1.0;
    } else {
        if (remainingHours === 0) {
            chargedDays = fullDays;
        } else if (remainingHours < 12) {
            chargedDays = fullDays + 0.5;
        } else {
            chargedDays = fullDays + 1.0;
        }
    }

    let desc = '';
    if (fullDays > 0) {
        desc += `${fullDays} day${fullDays > 1 ? 's' : ''}`;
        if (remainingHours > 0) {
            const roundedHours = Math.round(remainingHours * 10) / 10;
            desc += `, ${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
        }
    } else {
        const roundedHours = Math.round(totalHours * 10) / 10;
        desc = `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
    }

    // Pricing Logic (~817-819)
    const price = parseFloat(listing.price) || 0;
    const deposit = parseFloat(listing.securityDeposit) || 0;
    const subtotal = chargedDays * price;
    const total = subtotal + deposit;

    return {
        hours: totalHours,
        days: fullDays,
        chargedDays: chargedDays,
        description: desc,
        subtotal,
        deposit,
        total
    };
}
// END calculateBooking

// BEGIN buildBookingRequest
export function buildBookingRequest(listing, startLocal, endLocal) {
    return {
        listingId: listing._id,
        startDate: new Date(startLocal).toISOString(),
        endDate: new Date(endLocal).toISOString()
    };
}
// END buildBookingRequest


// ============================================================================
// UTILITIES
// ============================================================================

export function getMinStart(now = new Date()) {
    const minStart = new Date(now.getTime());
    minStart.setMinutes(Math.ceil(minStart.getMinutes() / 30) * 30, 0, 0); // 30-min rounding
    return minStart;
}

export function formatForDatetimeLocal(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
}


// ============================================================================
// BOOKING PAGE COMPONENT
// ============================================================================
export default function BookingPage() {
    useTheme();
    const scrollState = useScrollHide();
    const navigate = useNavigate();

    // ── Auth State ──
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // ── Listings Data ──
    const [allListings, setAllListings] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // ── Modal State ──
    const [selectedListing, setSelectedListing] = useState(null);
    const [bookingStart, setBookingStart] = useState('');
    const [bookingEnd, setBookingEnd] = useState('');
    const [validationError, setValidationError] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);

    // ── API State ──
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');
    const [serverBooking, setServerBooking] = useState(null);
    const abortControllerRef = useRef(null);

    // ── Init Data & Auth ──
    useEffect(() => {
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!loggedIn) {
            navigate('/login');
            return;
        }

        setIsLoggedIn(true);
        try {
            const user = JSON.parse(localStorage.getItem('current_user'));
            setCurrentUser(user);
        } catch (_e) {}

        // Load listings
        let listingsToUse = [];
        try {
            const stored = localStorage.getItem('RentFlow_listings');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    listingsToUse = parsed;
                }
            }
        } catch (e) {
            console.error("Error reading RentFlow_listings", e);
        }

        if (listingsToUse.length === 0) {
            listingsToUse = Array.isArray(productsData) ? productsData : [];
        }
        setAllListings(listingsToUse);

        // Derive categories safely
        const cats = Array.from(new Set(listingsToUse.map(l => l.category).filter(Boolean)));
        setCategories(['All', ...cats]);

        // Fallback for legacy wallet logic (preserve exact approach from contactus.jsx)
        window.__DISABLE_LEGACY_NAVBAR_SCROLL__ = true;
        if (!document.getElementById('legacy-navbar-script')) {
            const script = document.createElement('script');
            script.id = 'legacy-navbar-script';
            script.src = '../../js/navbar-scroll.js';
            document.body.appendChild(script);
        }
    }, [navigate]);

    // ── Pro Status Gating ──
    const checkProStatus = () => {
        try {
            const userStr = localStorage.getItem('current_user');
            if (!userStr) return false;
            const user = JSON.parse(userStr);
            if (user.isPremium || user.isPro) {
                if (user.premiumExpiryDate) {
                    const expiry = new Date(user.premiumExpiryDate);
                    if (new Date() > expiry) {
                        user.isPremium = false;
                        user.isPro = false;
                        localStorage.setItem('current_user', JSON.stringify(user));
                        const allUsersStr = localStorage.getItem('user');
                        if (allUsersStr) {
                            let allUsers = JSON.parse(allUsersStr);
                            const userIndex = allUsers.findIndex(u => u.useremail === user.useremail);
                            if (userIndex !== -1) {
                                allUsers[userIndex].isPremium = false;
                                allUsers[userIndex].isPro = false;
                                localStorage.setItem('user', JSON.stringify(allUsers));
                            }
                        }
                        alert("Your Premium subscription has expired. Phone numbers are hidden.");
                        return false;
                    }
                }
                return true;
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    };
    const isPro = checkProStatus();

    // ── Filter Listings ──
    const filteredListings = allListings.filter(item => {
        if (activeCategory !== 'All' && item.category !== activeCategory) return false;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const title = (item.title || '').toLowerCase();
            const category = (item.category || '').toLowerCase();
            const location = (item.seller?.address || item.seller?.city || '').toLowerCase();
            return title.includes(query) || category.includes(query) || location.includes(query);
        }
        return true;
    });

    // ── Modal Interactions ──
    const openModal = (listing) => {
        setSelectedListing(listing);
        setIsConfirmed(false);
        setValidationError('');

        const defaultStart = getMinStart();
        setBookingStart(formatForDatetimeLocal(defaultStart));

        const defaultEnd = new Date(defaultStart.getTime());
        defaultEnd.setHours(defaultEnd.getHours() + 24);
        setBookingEnd(formatForDatetimeLocal(defaultEnd));

        document.body.style.overflow = 'hidden'; // lock scroll
    };

    const closeModal = () => {
        setSelectedListing(null);
        setIsConfirmed(false);
        setValidationError('');
        setApiError('');
        setServerBooking(null);
        setIsSubmitting(false);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        document.body.style.overflow = ''; // unlock scroll
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && selectedListing) {
                closeModal();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = ''; // cleanup scroll lock on unmount
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [selectedListing]);


    // ── Form & Validation ──
    let isFormValid = true;
    let valError = '';
    const now = new Date();
    const startObj = bookingStart ? new Date(bookingStart) : null;
    const endObj = bookingEnd ? new Date(bookingEnd) : null;

    if (startObj && endObj) {
        // OLD: Start time cannot be in the past (1 minute buffer)
        if (startObj.getTime() < now.getTime() - 60000) {
            valError = "⚠️ Start time cannot be in the past.";
            isFormValid = false;
        }
        // OLD: End time cannot be earlier than actual (current) time
        else if (endObj.getTime() < now.getTime()) {
            valError = "⚠️ End time cannot be earlier than actual (current) time.";
            isFormValid = false;
        }
        // OLD: End time must be after the start time
        else if (endObj.getTime() <= startObj.getTime()) {
            valError = "⚠️ End time must be after the start time.";
            isFormValid = false;
        }
        else {
            // NEW rules
            const diffHours = (endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60);
            if (diffHours < 1) {
                valError = "⚠️ Minimum rental duration is 1 hour.";
                isFormValid = false;
            } else if (diffHours > 24 * 90) {
                valError = "⚠️ Maximum rental duration is 90 days.";
                isFormValid = false;
            }
        }
    } else {
        isFormValid = false;
    }

    const calcResult = calculateBooking(selectedListing || {}, startObj, endObj);

    const handleConfirm = async () => {
        if (!isFormValid || isSubmitting) {
            setValidationError(valError);
            return;
        }

        const devUserId = localStorage.getItem('devUserId');
        const objectIdRegex = /^[a-f\d]{24}$/i;

        if (!devUserId || !objectIdRegex.test(devUserId)) {
            if (import.meta.env.DEV) {
                setApiError("Development Error: Set localStorage devUserId to a valid 24-character MongoDB ObjectId.");
            } else {
                setApiError("Authentication required. Please log in.");
            }
            return;
        }

        if (!selectedListing || !selectedListing._id || !objectIdRegex.test(selectedListing._id)) {
            setApiError("Cannot book this listing: invalid or missing listing ID.");
            return;
        }

        setValidationError('');
        setApiError('');
        setIsSubmitting(true);

        const payload = buildBookingRequest(selectedListing, startObj, endObj);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(`${apiUrl}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-dev-user-id': devUserId
                },
                body: JSON.stringify(payload),
                signal: abortControllerRef.current.signal
            });

            const data = await response.json().catch(() => null);

            if (response.status === 201 && data?.success) {
                setIsConfirmed(true);
                setServerBooking(data.data);
            } else if (response.status === 400) {
                setApiError(data?.message || "Invalid booking request.");
            } else if (response.status === 401) {
                setApiError(import.meta.env.DEV ? "Development Error: Set localStorage devUserId to a valid 24-character MongoDB ObjectId." : "Authentication required. Please log in.");
            } else if (response.status === 404) {
                setApiError("Listing not found.");
            } else if (response.status === 409 && data?.error === "LISTING_UNAVAILABLE") {
                setApiError("The listing is unavailable for the selected dates.");
            } else if (response.status === 503) {
                setApiError("Listing model not available yet. (Backend dependency issue)");
            } else {
                setApiError(data?.message || "Booking failed. Please try again.");
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            setApiError("Cannot reach the server. Please try again.");
        } finally {
            setIsSubmitting(false);
            abortControllerRef.current = null;
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    };


    // ── Render Helpers ──
    const firstName = currentUser ? (currentUser.name || currentUser.username || currentUser.userfname || 'User').split(' ')[0] : 'User';
    const savedImage = currentUser ? (localStorage.getItem('profileImage') || '../assets/profile.png') : '../assets/profile.png';
    const premiumText = (currentUser && currentUser.isPro) ? 'Pro Member' : 'Premium';

    return (
        <div className="booking-page">

            {/* ── Navbar ── */}
            <header
                className={`site-header${scrollState.hidden ? ' hidden-nav' : ''}${scrollState.scrolled ? ' scrolled' : ''}`}
                id="site-header"
            >
                <Link to="/" className="logo">Rent<span style={{ color: '#3a5bd9' }}>Flow</span></Link>
                <nav className="nav-links" id="main-nav">
                    <Link to="/">Home</Link>
                    <Link to="/booking" className="active" style={{ color: '#3a5bd9', fontWeight: 600 }}>Explore Rentals</Link>
                    <Link to="/booking-history">My Rentals</Link>
                    <Link to="/create-listing" style={{ color: 'var(--accent-blue-bright)', fontWeight: 600 }}>+ Post Listing</Link>
                    <Link to="/contact">Contact &amp; FAQ</Link>
                </nav>
                <div className="nav-cta" id="auth-buttons" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {isLoggedIn && currentUser && (
                        <div style={{ position: 'relative' }}>
                            <div
                                className="profile-dropdown-trigger"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={e => { e.stopPropagation(); setShowProfileMenu(p => !p); }}
                            >
                                <div style={{ width: 32, height: 32, background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                                    <img src={savedImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <span style={{ fontWeight: 600, color: '#fff' }}>{firstName}</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 2 }}><polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                            <div
                                className="profile-dropdown-menu"
                                style={{ display: showProfileMenu ? 'flex' : 'none', position: 'absolute', top: 40, right: 0, background: '#12172b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, width: 180, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, padding: '6px 0', flexDirection: 'column' }}
                            >
                                <Link to="/profile" style={{ padding: '10px 16px', color: '#b0b8c6', textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'block' }}>My Profile</Link>
                                <Link to="/chat" style={{ padding: '10px 16px', color: '#b0b8c6', textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'block' }}>Messages</Link>
                                <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); setShowProfileMenu(false); if (window.openWalletModal) window.openWalletModal(); }} style={{ padding: '10px 16px', color: '#b0b8c6', textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'block' }}>My Wallet</a>
                                <Link to="/premium" style={{ padding: '10px 16px', color: '#eab308', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'block', whiteSpace: 'nowrap' }}>👑 {premiumText}</Link>
                                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
                                <a href="#" onClick={() => { localStorage.removeItem('isLoggedIn'); navigate('/login'); }} style={{ padding: '10px 16px', color: '#ef4444', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'block' }}>Logout</a>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Main Browse UI ── */}
            <div className="booking-container" onClick={() => setShowProfileMenu(false)}>
                <div className="booking-header">
                    <h1>Explore Rentals</h1>
                    <div className="booking-controls">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search by item, category, or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="category-filters">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="listings-grid">
                    {filteredListings.length === 0 ? (
                        <div className="empty-state">
                            <h3>No listings found</h3>
                            <p>Try adjusting your search or category filter.</p>
                        </div>
                    ) : (
                        filteredListings.map(item => {
                            const rawImages = Array.isArray(item.images) ? item.images : [];
                            const validImages = rawImages.filter(img => img && typeof img === 'string' && img.trim() !== '');
                            const imageSrc = validImages.length > 0 ? validImages[0] : '../../assets/profile.png'; // using a safe local fallback if via.placeholder isn't allowed
                            const initial = item.seller?.name?.charAt(0).toUpperCase() || 'S';

                            return (
                                <div className="listing-card" key={item.id}>
                                    <img
                                        src={imageSrc}
                                        alt={item.title}
                                        className="listing-image"
                                        onError={(e) => { e.target.src = '../../assets/profile.png'; }}
                                    />
                                    <div className="listing-content">
                                        <div className="listing-category">{item.category}</div>
                                        <div className="listing-title">{item.title}</div>
                                        <div className="listing-location">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                            {item.seller?.address || item.seller?.city || 'Unknown Location'}
                                        </div>

                                        <div className="listing-price-row">
                                            <div className="listing-price">
                                                ₹{item.price} <span>/ day</span>
                                            </div>
                                            <button className="btn-book" onClick={() => openModal(item)}>
                                                Book Rental
                                            </button>
                                        </div>

                                        <div className="listing-seller">
                                            <div className="seller-avatar">{initial}</div>
                                            <div className="seller-info">
                                                <div className="seller-name">{item.seller?.name || 'Verified Owner'}</div>
                                                <div className="seller-contact">
                                                    {isPro ? (
                                                        <span className="contact-unlocked">{item.seller?.phone || 'Contact Available'}</span>
                                                    ) : (
                                                        <Link to="/premium" className="contact-locked">Unlock Contact (Pro)</Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Booking Modal ── */}
            {selectedListing && (
                <div className="modal-overlay" onClick={handleBackdropClick}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Book Rental</h2>
                            <button className="btn-close" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body">
                            {isConfirmed ? (
                                <div className="success-message">
                                    <div className="success-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <h3>Booking Confirmed!</h3>
                                    <p>Your request has been sent to the owner.</p>

                                    {serverBooking && (
                                        <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginTop: '20px', fontSize: '0.9rem' }}>
                                            <div style={{ marginBottom: '10px' }}><strong>Booking ID:</strong> {serverBooking._id}</div>
                                            <div style={{ marginBottom: '10px' }}><strong>Status:</strong> {serverBooking.status || 'Pending, awaiting seller approval'}</div>

                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '15px 0' }}></div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <span>Duration (Server)</span>
                                                <span>{serverBooking.totalDays} day(s)</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <span>Subtotal (₹{serverBooking.pricePerDay}/day)</span>
                                                <span>₹{serverBooking.subtotal}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <span>Security Deposit</span>
                                                <span>₹{serverBooking.securityDeposit}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                <span>Final Total</span>
                                                <span>₹{serverBooking.total}</span>
                                            </div>

                                            {serverBooking.total !== calcResult.total && (
                                                <div style={{ marginTop: '15px', fontSize: '0.85rem', color: '#fbbf24', lineHeight: 1.4 }}>
                                                    * Note: The final amount was calculated by the server and differs from the initial estimate.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button className="btn-confirm" onClick={closeModal} style={{ marginTop: '20px' }}>
                                        Done
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="selected-listing-preview">
                                        <img
                                            src={Array.isArray(selectedListing.images) && selectedListing.images[0] ? selectedListing.images[0] : '../../assets/profile.png'}
                                            alt={selectedListing.title}
                                            className="selected-image"
                                            onError={(e) => { e.target.src = '../../assets/profile.png'; }}
                                        />
                                        <div className="selected-details">
                                            <h4>{selectedListing.title}</h4>
                                            <p>{selectedListing.category} • {selectedListing.seller?.address || selectedListing.seller?.city || 'Location'}</p>
                                            <div className="selected-price">₹{selectedListing.price} / day</div>
                                        </div>
                                    </div>

                                    {(validationError || apiError || (!isFormValid && (bookingStart && bookingEnd))) && (
                                        <div className="validation-error">
                                            {validationError || apiError || valError}
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Start Date &amp; Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            value={bookingStart}
                                            onChange={(e) => setBookingStart(e.target.value)}
                                            min={formatForDatetimeLocal(getMinStart())}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>End Date &amp; Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            value={bookingEnd}
                                            onChange={(e) => setBookingEnd(e.target.value)}
                                        />
                                    </div>

                                    {isFormValid && startObj && endObj && (
                                        <div className="pricing-summary">
                                            <div className="pricing-row">
                                                <span>Duration</span>
                                                <span>
                                                    {calcResult.description} (Charged as {calcResult.chargedDays} day{calcResult.chargedDays !== 1 ? 's' : ''})
                                                </span>
                                            </div>
                                            <div className="pricing-row">
                                                <span>Subtotal</span>
                                                <span>₹{calcResult.subtotal.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="pricing-row">
                                                <span>Security Deposit (Refundable)</span>
                                                <span>₹{calcResult.deposit.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="pricing-row total">
                                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Estimated total (final amount confirmed by server)</span>
                                                <span>₹{calcResult.total.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        className="btn-confirm"
                                        disabled={!isFormValid || isSubmitting}
                                        onClick={handleConfirm}
                                    >
                                        {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
