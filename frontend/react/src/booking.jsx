import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme, useScrollHide } from './useNavbarBehavior';
import '../../css/index.css';
import './styles/booking.css';
import { getListings, getAuthHeaders, getAuthUser } from './services/api';
import Navbar from './components/Navbar';

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
    const platformFee = Math.round(subtotal * 0.02);
    const total = subtotal + platformFee + deposit;

    return {
        hours: totalHours,
        days: fullDays,
        chargedDays: chargedDays,
        description: desc,
        subtotal,
        platformFee,
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

export function getCategoryFallback(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('elect') || cat.includes('gadget') || cat.includes('device') || cat.includes('camera')) return '/assets/electronics-clean.jpg';
    if (cat.includes('vehic') || cat.includes('car') || cat.includes('bike')) return '/assets/vehicles-clean.jpg';
    if (cat.includes('fash') || cat.includes('cloth') || cat.includes('wear')) return '/assets/fashion-clean.jpg';
    if (cat.includes('prop') || cat.includes('real') || cat.includes('furn') || cat.includes('apart')) return '/assets/property-clean.jpg';
    if (cat.includes('sport') || cat.includes('fit') || cat.includes('out') || cat.includes('party')) return '/assets/sports-clean.jpg';
    if (cat.includes('tool') || cat.includes('equip')) return '/assets/tools-clean.jpg';
    return '/assets/browse-rentals-ai.jpg';
}

export function resolveImageUrl(img, category) {
    const fallback = getCategoryFallback(category);
    if (!img || img === '/assets/profile.png') return fallback;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    if (img.startsWith('/uploads')) {
        return `${apiUrl}${img}`;
    }
    if (img.startsWith('uploads/')) {
        return `${apiUrl}/${img}`;
    }
    return img;
}

function ListingCardMedia({ item, imageSrc }) {
    const hasVideo = Boolean(item.video);
    // When listing has video: 0 is Video, 1 is Photo. When no video: Photo only.
    const [activeTab, setActiveTab] = useState(0);
    const touchStartX = useRef(null);

    const handleTouchStart = (e) => {
        if (!hasVideo) return;
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (!hasVideo || touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        if (deltaX < -35) {
            // Swiped to the left -> navigate to uploaded photo
            setActiveTab(1);
        } else if (deltaX > 35) {
            // Swiped to the right -> navigate to video
            setActiveTab(0);
        }
        touchStartX.current = null;
    };

    const renderPhoto = () => (
        <>
            <img
                src={imageSrc}
                alt={item.title}
                className="listing-image"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                onLoad={(e) => {
                    if (e.target.naturalWidth <= 2 && e.target.naturalHeight <= 2) {
                        const fb = getCategoryFallback(item.category);
                        if (e.target.src !== fb) e.target.src = fb;
                    }
                }}
                onError={(e) => {
                    const fb = getCategoryFallback(item.category);
                    if (e.target.src !== fb && !e.target.src.endsWith(fb)) {
                        e.target.src = fb;
                    }
                }}
            />
            {item.conditionLabel && (
                <span style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(4px)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '100px',
                    zIndex: 2,
                    pointerEvents: 'none'
                }}>
                    {item.conditionLabel}
                </span>
            )}
        </>
    );

    const renderVideo = () => (
        <div style={{ position: 'relative', width: '100%', height: '200px', background: '#000' }}>
            <video
                src={item.video}
                controls
                preload="metadata"
                playsInline
                style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
            />
        </div>
    );

    return (
        <div
            className="listing-media-slider"
            style={{ position: 'relative', width: '100%', height: '200px', background: '#050b14', overflow: 'hidden' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {!hasVideo ? (
                renderPhoto()
            ) : activeTab === 0 ? (
                renderVideo()
            ) : (
                renderPhoto()
            )}

            {/* Slider Navigation Arrows (shown when listing has video) */}
            {hasVideo && (
                <>
                    {activeTab === 0 ? (
                        <button
                            type="button"
                            aria-label="View Uploaded Image"
                            onClick={(e) => { e.stopPropagation(); setActiveTab(1); }}
                            style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(0, 0, 0, 0.65)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 3,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                transition: 'all 0.2s ease',
                            }}
                            title="Swipe / Click arrow to view uploaded image"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            type="button"
                            aria-label="View Video"
                            onClick={(e) => { e.stopPropagation(); setActiveTab(0); }}
                            style={{
                                position: 'absolute',
                                left: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(0, 0, 0, 0.65)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 3,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                transition: 'all 0.2s ease',
                            }}
                            title="Swipe / Click arrow to view video"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                    )}

                    {/* Dot indicators */}
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '6px',
                        zIndex: 3,
                        background: 'rgba(0, 0, 0, 0.55)',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backdropFilter: 'blur(4px)',
                        alignItems: 'center'
                    }}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveTab(0); }}
                            aria-label="Video slide"
                            style={{
                                width: activeTab === 0 ? '16px' : '6px',
                                height: '6px',
                                borderRadius: '3px',
                                background: activeTab === 0 ? 'var(--primary-orange, #f97316)' : 'rgba(255,255,255,0.5)',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        />
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveTab(1); }}
                            aria-label="Photo slide"
                            style={{
                                width: activeTab === 1 ? '16px' : '6px',
                                height: '6px',
                                borderRadius: '3px',
                                background: activeTab === 1 ? 'var(--primary-orange, #f97316)' : 'rgba(255,255,255,0.5)',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    );
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
    const CANONICAL_CATEGORIES = ['All', 'Vehicles', 'Electronics', 'Fashion', 'Tools', 'Property', 'Sports'];
    const [allListings, setAllListings] = useState([]);
    const [categories, setCategories] = useState(CANONICAL_CATEGORIES);
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeCondition, setActiveCondition] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [visibleCount, setVisibleCount] = useState(24);

    // ── Modal State ──
    const [selectedListing, setSelectedListing] = useState(null);
    const [bookingStart, setBookingStart] = useState('');
    const [bookingEnd, setBookingEnd] = useState('');
    const [validationError, setValidationError] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);

    // ── API State ──
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');
    const [availabilityConflict, setAvailabilityConflict] = useState(null);
    const [serverBooking, setServerBooking] = useState(null);
    const abortControllerRef = useRef(null);

    // ── Init Data & Auth (Decision B Option 2: Restricted to logged-in users) ──
    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
            navigate('/login');
            return;
        }

        setIsLoggedIn(true);

        try {
            const user = JSON.parse(storedUser);
            setCurrentUser(user);
        } catch (_e) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        }

        // Fallback for legacy wallet logic (preserve exact approach from contactus.jsx)
        window.__DISABLE_LEGACY_NAVBAR_SCROLL__ = true;
        if (!document.getElementById('legacy-navbar-script')) {
            const script = document.createElement('script');
            script.id = 'legacy-navbar-script';
            script.src = '../../js/navbar-scroll.js';
            document.body.appendChild(script);
        }
    }, [navigate]);

    // ── Search & Filter API Fetch ──
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setFetchError('');

        const delayDebounceFn = setTimeout(async () => {
            try {
                const params = {};
                if (activeCategory !== 'All') params.category = activeCategory;
                if (activeCondition !== 'All') params.condition = activeCondition;
                if (searchQuery.trim()) params.search = searchQuery.trim();
                if (sortBy) params.sortBy = sortBy;

                const results = await getListings(params);
                if (isMounted) {
                    setAllListings(results);
                    setVisibleCount(24);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Error searching API", err);
                if (isMounted) {
                    setFetchError("Failed to load rental listings. Please try again.");
                    setIsLoading(false);
                }
            }
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(delayDebounceFn);
        };
    }, [searchQuery, activeCategory, activeCondition, sortBy]);

    // ── Pro Status Gating ──
    const checkProStatus = () => {
        const user = getAuthUser();
        if (!user) return false;
        return !!user.isPro;
    };

    const isPro = checkProStatus();

    // ── Client Deduplication & Pagination ──
    const uniqueListings = React.useMemo(() => {
        const seen = new Set();
        return (allListings || []).filter(item => {
            const sig = `${(item.title || '').trim().toLowerCase()}|${(item.category || '').toLowerCase()}`;
            if (seen.has(sig)) return false;
            seen.add(sig);
            return true;
        });
    }, [allListings]);

    const displayedListings = uniqueListings.slice(0, visibleCount);

    // ── Modal Interactions ──
    const openModal = (listing) => {
        setSelectedListing(listing);
        setIsConfirmed(false);
        setValidationError('');
        setApiError('');
        setAvailabilityConflict(null);

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
        setAvailabilityConflict(null);
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

        const token = localStorage.getItem('token');
        const objectIdRegex = /^[a-f\d]{24}$/i;

        if (!token) {
            setApiError("Authentication required. Please log in.");
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
                    ...getAuthHeaders()
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
                setApiError("Authentication required. Please log in.");
            } else if (response.status === 404) {
                setApiError("Listing not found.");
            } else if (response.status === 409 && data?.error === "LISTING_UNAVAILABLE") {
                setAvailabilityConflict({
                    availableFrom: data.availableFrom,
                    message: data.message || "The listing is unavailable for the selected dates."
                });
                setApiError(data?.message || "The listing is unavailable for the selected dates.");
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
    const savedImage = currentUser ? (localStorage.getItem('profileImage') || '/assets/profile.png') : '/assets/profile.png';
    const premiumText = (currentUser && currentUser.isPro) ? 'Pro Member' : 'Premium';

    return (
        <div className="booking-page">

            {/* ── Navbar ── */}
            <Navbar />

            {/* ── Main Browse UI ── */}
            <div className="booking-container" onClick={() => setShowProfileMenu(false)}>
                <div className="booking-header">
                    <h1>Explore Rentals</h1>
                    <div className="booking-controls">
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by item, category, or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ flex: '1 1 300px' }}
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '100px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-strongest)',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="oldest">Oldest First</option>
                                </select>

                                <select
                                    value={activeCondition}
                                    onChange={(e) => setActiveCondition(e.target.value)}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '100px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-strongest)',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="All">All Conditions</option>
                                    <option value="brand-new">Brand New</option>
                                    <option value="like-new">Like New</option>
                                    <option value="good">Good Condition</option>
                                    <option value="fair">Fair</option>
                                </select>
                            </div>
                        </div>

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

                {isLoading ? (
                    <div className="listings-grid">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                            <div className="listing-card" key={n} style={{ opacity: 0.6, pointerEvents: 'none' }}>
                                <div style={{ width: '100%', height: '180px', background: 'var(--border)', borderRadius: '12px 12px 0 0' }}></div>
                                <div style={{ padding: '16px' }}>
                                    <div style={{ height: '12px', width: '35%', background: 'var(--border)', borderRadius: '4px', marginBottom: '10px' }}></div>
                                    <div style={{ height: '18px', width: '85%', background: 'var(--border)', borderRadius: '4px', marginBottom: '12px' }}></div>
                                    <div style={{ height: '12px', width: '50%', background: 'var(--border)', borderRadius: '4px', marginBottom: '20px' }}></div>
                                    <div style={{ height: '36px', width: '100%', background: 'var(--border)', borderRadius: '8px' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : fetchError ? (
                    <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Unable to load listings</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{fetchError}</p>
                        <button onClick={() => { setActiveCategory('All'); setSearchQuery(''); }} className="btn-book" style={{ margin: '0 auto' }}>
                            Retry
                        </button>
                    </div>
                ) : uniqueListings.length === 0 ? (
                    <div className="empty-state">
                        <h3>No rentals found</h3>
                        <p>No listings matched your criteria in {activeCategory !== 'All' ? activeCategory : 'any category'}.</p>
                        {(activeCategory !== 'All' || searchQuery || activeCondition !== 'All') && (
                            <button
                                onClick={() => { setActiveCategory('All'); setActiveCondition('All'); setSearchQuery(''); }}
                                style={{ marginTop: '14px', padding: '8px 18px', background: 'transparent', border: '1px solid var(--primary-orange)', color: 'var(--primary-orange)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="listings-grid">
                            {displayedListings.map((item, index) => {
                                const rawImg = (Array.isArray(item.images) && item.images[0]) || item.image;
                                const imageSrc = resolveImageUrl(rawImg, item.category);
                                const initial = item.seller?.name?.charAt(0).toUpperCase() || 'S';

                                return (
                                    <div className="listing-card" key={`${item._id || item.id || 'item'}-${index}`}>
                                        <ListingCardMedia item={item} imageSrc={imageSrc} />

                                        <div className="listing-content">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div className="listing-category">{item.category}</div>
                                                {item.condition && !item.conditionLabel && (
                                                    <span style={{ fontSize: '11px', textTransform: 'capitalize', color: 'var(--primary-orange)', fontWeight: 600 }}>
                                                        {item.condition.replace('-', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="listing-title">{item.title}</div>

                                            {/* Key category specs preview */}
                                            {item.categorySpecs && Object.keys(item.categorySpecs).length > 0 && (
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '4px 0 8px 0' }}>
                                                    {Object.entries(item.categorySpecs).filter(([_, v]) => v).slice(0, 2).map(([k, v]) => (
                                                        <span key={k} style={{ fontSize: '11px', background: 'var(--bg-subtle, rgba(0,0,0,0.04))', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                                            {v}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="listing-location">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                {item.seller?.address || item.seller?.city || 'Unknown Location'}
                                            </div>

                                            <div className="listing-price-row">
                                                <div className="listing-price">
                                                    ₹{item.price} <span>/ {item.period || 'day'}</span>
                                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>+ 2% platform fee</span>
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
                            })}
                        </div>
                        {uniqueListings.length > visibleCount && (
                            <div style={{ textAlign: 'center', marginTop: '36px', marginBottom: '24px' }}>
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 24)}
                                    className="btn-book"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px 28px',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        margin: '0 auto'
                                    }}
                                >
                                    Load More Rentals ({uniqueListings.length - visibleCount} more)
                                </button>
                            </div>
                        )}
                    </>
                )}
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
                                                <span>Platform Service Fee (2%)</span>
                                                <span>₹{(serverBooking.platformFee && serverBooking.platformFee > 0) ? serverBooking.platformFee : Math.round((serverBooking.subtotal || 0) * 0.02)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <span>Security Deposit (Refundable to Wallet)</span>
                                                <span>₹{serverBooking.securityDeposit}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                <span>Final Total</span>
                                                <span>₹{(() => {
                                                    const fee = (serverBooking.platformFee && serverBooking.platformFee > 0) ? serverBooking.platformFee : Math.round((serverBooking.subtotal || 0) * 0.02);
                                                    const expected = (serverBooking.subtotal || 0) + fee + (serverBooking.securityDeposit || 0);
                                                    return (serverBooking.total && serverBooking.total >= expected) ? serverBooking.total : expected;
                                                })()}</span>
                                            </div>

                                            {(() => {
                                                const fee = (serverBooking.platformFee && serverBooking.platformFee > 0) ? serverBooking.platformFee : Math.round((serverBooking.subtotal || 0) * 0.02);
                                                const expected = (serverBooking.subtotal || 0) + fee + (serverBooking.securityDeposit || 0);
                                                const finalT = (serverBooking.total && serverBooking.total >= expected) ? serverBooking.total : expected;
                                                return finalT !== calcResult.total;
                                            })() && (
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
                                    {selectedListing.video && (
                                        <div style={{ marginBottom: '14px' }}>
                                            <video
                                                controls
                                                preload="metadata"
                                                playsInline
                                                src={selectedListing.video}
                                                style={{ width: '100%', borderRadius: '8px', maxHeight: '220px', background: '#000', display: 'block' }}
                                            >
                                                <source src={selectedListing.video} type="video/mp4" />
                                                Your browser does not support video playback.
                                            </video>
                                        </div>
                                    )}

                                    <div className="selected-listing-preview">
                                        <img
                                            src={resolveImageUrl((Array.isArray(selectedListing.images) && selectedListing.images[0]) || selectedListing.image, selectedListing.category)}
                                            alt={selectedListing.title}
                                            className="selected-image"
                                            referrerPolicy="no-referrer"
                                            onLoad={(e) => {
                                                if (e.target.naturalWidth <= 2 && e.target.naturalHeight <= 2) {
                                                    const fb = getCategoryFallback(selectedListing?.category);
                                                    if (e.target.src !== fb) e.target.src = fb;
                                                }
                                            }}
                                            onError={(e) => {
                                                const fb = getCategoryFallback(selectedListing?.category);
                                                if (e.target.src !== fb && !e.target.src.endsWith(fb)) {
                                                    e.target.src = fb;
                                                }
                                            }}
                                        />
                                        <div className="selected-details">
                                            <h4>{selectedListing.title}</h4>
                                            <p>{selectedListing.category} • {selectedListing.seller?.address || selectedListing.seller?.city || 'Location'}</p>
                                            <div className="selected-price">₹{selectedListing.price} / day</div>
                                        </div>
                                    </div>

                                    {availabilityConflict ? (
                                        <div style={{
                                            background: '#fffbeb',
                                            border: '1px solid #f59e0b',
                                            color: '#92400e',
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            marginBottom: '16px',
                                            fontSize: '0.88rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            lineHeight: 1.4
                                        }}>
                                            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309' }}>
                                                <span>⚠️</span>
                                                <span>Item Currently Booked</span>
                                            </div>
                                            <div>{availabilityConflict.message}</div>
                                            {availabilityConflict.availableFrom && (
                                                <button
                                                    type="button"
                                                    style={{
                                                        alignSelf: 'flex-start',
                                                        marginTop: '2px',
                                                        padding: '6px 12px',
                                                        fontSize: '0.82rem',
                                                        background: '#f59e0b',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '5px',
                                                        cursor: 'pointer',
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                    onClick={() => {
                                                        const availDate = new Date(availabilityConflict.availableFrom);
                                                        setBookingStart(formatForDatetimeLocal(availDate));
                                                        const nextEnd = new Date(availDate.getTime() + 24 * 60 * 60 * 1000);
                                                        setBookingEnd(formatForDatetimeLocal(nextEnd));
                                                        setAvailabilityConflict(null);
                                                        setApiError('');
                                                    }}
                                                >
                                                    📅 Set Start Date to Available Time
                                                </button>
                                            )}
                                        </div>
                                    ) : (validationError || apiError || (!isFormValid && (bookingStart && bookingEnd))) ? (
                                        <div className="validation-error">
                                            {validationError || apiError || valError}
                                        </div>
                                    ) : null}

                                    <div className="form-group">
                                        <label>Start Date &amp; Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            value={bookingStart}
                                            onChange={(e) => {
                                                setBookingStart(e.target.value);
                                                setAvailabilityConflict(null);
                                                setApiError('');
                                            }}
                                            min={formatForDatetimeLocal(getMinStart())}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>End Date &amp; Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            value={bookingEnd}
                                            onChange={(e) => {
                                                setBookingEnd(e.target.value);
                                                setAvailabilityConflict(null);
                                                setApiError('');
                                            }}
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
                                                <span>Platform Service Fee (2%)</span>
                                                <span style={{ color: '#10b981' }}>+ ₹{(calcResult.platformFee || 0).toLocaleString('en-IN')}</span>
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
