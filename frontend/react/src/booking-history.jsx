import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../css/index.css';
import './styles/booking-history.css';
import { useTheme, useScrollHide } from './useNavbarBehavior';

// ============================================================================
// UTILITIES
// ============================================================================

function formatDate(dateString) {
    if (!dateString) return '';
    const hasTime = dateString.includes('T') || dateString.includes(':');
    const date = new Date(dateString);
    if (hasTime) {
        const options = {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleString('en-IN', options);
    } else {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-IN', options);
    }
}

function getSeedBookings() {
    const now = new Date();

    const d1Start = new Date(now); d1Start.setDate(now.getDate() - 20);
    const d1End   = new Date(now); d1End.setDate(now.getDate() - 15);
    const d2Start = new Date(now); d2Start.setDate(now.getDate() - 2);
    const d2End   = new Date(now); d2End.setDate(now.getDate() + 3);
    const d3Start = new Date(now); d3Start.setDate(now.getDate() - 40);
    const d3End   = new Date(now); d3End.setDate(now.getDate() - 30);
    const d4Start = new Date(now); d4Start.setDate(now.getDate() + 5);
    const d4End   = new Date(now); d4End.setDate(now.getDate() + 8);

    return [
        {
            id: 'BKG-001', listingId: 'LIST-MOCK-2',
            itemTitle: 'Sony A7S III Mirrorless Camera',
            itemImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=300&q=80',
            lenderName: 'Priya Sharma',
            startDate: d1Start.toISOString().split('T')[0],
            endDate:   d1End.toISOString().split('T')[0],
            duration: 5, rate: 350, subtotal: 1750, deposit: 1500, platformFee: 0, grandTotal: 3250,
            status: 'Completed'
        },
        {
            id: 'BKG-002', listingId: 'LIST-MOCK-1',
            itemTitle: 'Apple MacBook Pro M3 (16-inch)',
            itemImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80',
            lenderName: 'Aryan Tyagi',
            startDate: d2Start.toISOString().split('T')[0],
            endDate:   d2End.toISOString().split('T')[0],
            duration: 5, rate: 500, subtotal: 2500, deposit: 2000, platformFee: 0, grandTotal: 4500,
            status: 'Active'
        },
        {
            id: 'BKG-003', listingId: 'LIST-MOCK-4',
            itemTitle: 'Bosch Power Drill Set',
            itemImage: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=300&q=80',
            lenderName: 'Ravi Kumar',
            startDate: d3Start.toISOString().split('T')[0],
            endDate:   d3End.toISOString().split('T')[0],
            duration: 10, rate: 150, subtotal: 1500, deposit: 500, platformFee: 0, grandTotal: 2000,
            status: 'Completed'
        },
        {
            id: 'BKG-004', listingId: 'LIST-MOCK-3',
            itemTitle: 'DJI Mavic 3 Pro Drone',
            itemImage: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=300&q=80',
            lenderName: 'Kabir Singh',
            startDate: d4Start.toISOString().split('T')[0],
            endDate:   d4End.toISOString().split('T')[0],
            duration: 3, rate: 600, subtotal: 1800, deposit: 3000, platformFee: 0, grandTotal: 4800,
            status: 'Pending'
        }
    ];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function BookingHistory() {
    // ── Shared hooks ──────────────────────────────────────────────────────────
    useTheme();
    const scrollState = useScrollHide();

    // ── Auth state ────────────────────────────────────────────────────────────
    const [isLoggedIn,      setIsLoggedIn]      = useState(false);
    const [currentUser,     setCurrentUser]     = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // ── Booking state ─────────────────────────────────────────────────────────
    // allBookings is stored in a ref so countdown mutations don't cause full re-renders
    const allBookingsRef = useRef([]);
    const [currentFilter, setCurrentFilter] = useState('All');
    const [displayedOrders, setDisplayedOrders] = useState([]);

    // ── Stats state ───────────────────────────────────────────────────────────
    const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, returned: 0, spent: 0 });

    // ── Countdown state (map: bookingId → string) ─────────────────────────────
    const [countdowns, setCountdowns] = useState({});

    // ── Receipt modal state ───────────────────────────────────────────────────
    const [receiptModal, setReceiptModal] = useState({ show: false, booking: null });
    const [pdfGenerating, setPdfGenerating] = useState(false);

    const navigate = useNavigate();

    // ── Helpers ───────────────────────────────────────────────────────────────

    const getMyBookings = useCallback(() => {
        const userEmail = currentUser ? currentUser.useremail : '';
        return allBookingsRef.current.filter(booking => {
            // Legacy seed bookings without renterEmail show only to rahul@example.com
            if (!booking.renterEmail) {
                return userEmail === 'rahul@example.com';
            }
            return booking.renterEmail === userEmail;
        });
    }, [currentUser]);

    const calcStats = useCallback(() => {
        const myBookings = getMyBookings();
        const activeCount    = myBookings.reduce((c, b) => b.status === 'Active'    ? c + 1 : c, 0);
        const completedCount = myBookings.reduce((c, b) => b.status === 'Completed' ? c + 1 : c, 0);
        const returnedCount  = myBookings.reduce((c, b) => b.status === 'Returned'  ? c + 1 : c, 0);
        const totalSpent     = myBookings.reduce((s, b) => b.status !== 'Cancelled' ? s + (b.grandTotal || 0) : s, 0);

        setStats({
            total:     myBookings.length,
            active:    activeCount,
            completed: completedCount,
            returned:  returnedCount,
            spent:     totalSpent
        });
    }, [getMyBookings]);

    const buildDisplayedOrders = useCallback((filter) => {
        const myBookings = getMyBookings();
        const filtered = filter === 'All' ? myBookings : myBookings.filter(b => b.status === filter);
        setDisplayedOrders(filtered);
    }, [getMyBookings]);

    // ── Init ──────────────────────────────────────────────────────────────────

    useEffect(() => {
        // Auth
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsLoggedIn(loggedIn);
        let user = null;
        if (loggedIn) {
            try { user = JSON.parse(localStorage.getItem('current_user')) || null; } catch { }
            setCurrentUser(user);
        }

        // Load bookings from localStorage, seed if absent
        const stored = localStorage.getItem('rentflow_bookings');
        if (stored) {
            try { allBookingsRef.current = JSON.parse(stored); } catch { allBookingsRef.current = getSeedBookings(); }
        } else {
            allBookingsRef.current = getSeedBookings();
            localStorage.setItem('rentflow_bookings', JSON.stringify(allBookingsRef.current));
        }

        // Wallet legacy script (same pattern as Contact)
        // TODO: replace with Mayank's shared React Navbar when available.
    }, []);

    // Re-compute stats & orders whenever user or filter changes
    useEffect(() => {
        calcStats();
        buildDisplayedOrders(currentFilter);
    }, [currentUser, currentFilter, calcStats, buildDisplayedOrders]);

    // ── Countdown timer ───────────────────────────────────────────────────────

    useEffect(() => {
        const tick = () => {
            const myBookings = getMyBookings();
            const newCountdowns = {};
            let didUpdate = false;

            myBookings.forEach(item => {
                if (item.status === 'Active' && item.endDate) {
                    const hasTime = item.endDate.includes('T') || item.endDate.includes(':');
                    const end = new Date(item.endDate);
                    if (!hasTime) end.setHours(23, 59, 59, 999);
                    const diff = end - new Date();

                    if (diff <= 0) {
                        newCountdowns[item.id] = 'Rental Ended';
                        // Auto-complete the booking
                        item.status = 'Completed';
                        didUpdate = true;
                    } else {
                        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const s = Math.floor((diff % (1000 * 60)) / 1000);
                        newCountdowns[item.id] = `Time Left: ${d}d ${h}h ${m}m ${s}s`;
                    }
                }
            });

            setCountdowns(newCountdowns);

            if (didUpdate) {
                localStorage.setItem('rentflow_bookings', JSON.stringify(allBookingsRef.current));
                calcStats();
                buildDisplayedOrders(currentFilter);
            }
        };

        const intervalId = setInterval(tick, 1000);
        return () => clearInterval(intervalId);
    }, [getMyBookings, calcStats, buildDisplayedOrders, currentFilter]);

    // ── Razorpay payment ──────────────────────────────────────────────────────

    const initiatePayment = (bookingId) => {
        const booking = allBookingsRef.current.find(b => b.id === bookingId);
        if (!booking) return;

        const options = {
            key: 'rzp_test_TPWlCTZ9mczHSa',
            amount: booking.grandTotal * 100,
            currency: 'INR',
            name: 'RentFlow',
            description: 'Payment for ' + booking.itemTitle,
            handler: function(response) {
                console.log('Successful Payment ID:', response.razorpay_payment_id);
                booking.status = 'Active';
                localStorage.setItem('rentflow_bookings', JSON.stringify(allBookingsRef.current));
                alert('Payment Successful! Rental is now Active.');
                calcStats();
                buildDisplayedOrders(currentFilter);
            },
            prefill: { name: 'User', email: 'user@example.com', contact: '9999999999' },
            theme: { color: '#2563eb' }
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response) => {
                alert('Payment Failed: ' + response.error.description);
            });
            rzp.open();
        } catch {
            alert('Failed to load payment gateway.');
        }
    };

    // ── PDF Invoice ───────────────────────────────────────────────────────────

    const downloadInvoice = () => {
        if (!receiptModal.booking) return;
        const booking = receiptModal.booking;
        setPdfGenerating(true);

        try {
            const now = new Date();
            const generatedOn = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                              + ', ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            const toRs = (val) => String(val).replace(/₹/g, 'Rs. ').trim();

            const jsPDFLib = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF || window.jspdf;
            if (!jsPDFLib) throw new Error('jsPDF not loaded');

            const doc = new jsPDFLib({ unit: 'mm', format: 'a4', orientation: 'portrait' });
            const W = 210; const lm = 18; const rm = W - 18;
            let y = 18;

            // Header bar
            doc.setFillColor(26, 26, 46);
            doc.rect(0, 0, W, 28, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(255, 255, 255);
            doc.text('Rent', lm, 17);

            doc.setTextColor(58, 91, 217);
            const rentW = doc.getTextWidth('Rent');
            doc.text('Flow', lm + rentW, 17);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(160, 170, 190);
            doc.text('Smart Dynamic Rental Platform', lm, 23);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(255, 255, 255);
            doc.text('Rental Receipt', rm, 15, { align: 'right' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(160, 170, 190);
            doc.text('Generated: ' + generatedOn, rm, 22, { align: 'right' });

            y = 40;

            // Item card
            doc.setFillColor(248, 250, 255);
            doc.roundedRect(lm, y, rm - lm, 28, 3, 3, 'F');
            doc.setFillColor(58, 91, 217);
            doc.rect(lm, y, 3, 28, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(17, 24, 39);
            doc.text(booking.itemTitle, lm + 8, y + 9);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(75, 85, 99);
            doc.text(`Lender: ${booking.lenderName}`, lm + 8, y + 16);
            doc.text(`${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}`, lm + 8, y + 22);

            y += 36;

            // Section title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.text('PRICE BREAKDOWN', lm, y);
            y += 5;
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.3);
            doc.line(lm, y, rm, y);
            y += 6;

            const row = (label, value, bold, valueColor) => {
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setFontSize(10);
                doc.setTextColor(55, 65, 81);
                doc.text(label, lm, y);
                if (valueColor) doc.setTextColor(...valueColor);
                else doc.setTextColor(17, 24, 39);
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.text(value, rm, y, { align: 'right' });
                y += 7;
                if (!bold) {
                    doc.setDrawColor(243, 244, 246);
                    doc.setLineWidth(0.2);
                    doc.line(lm, y - 1, rm, y - 1);
                }
            };

            row(`Base Rate (${toRs(`₹${booking.rate.toLocaleString('en-IN')}`)}/day) x ${booking.duration} days`,
                toRs(`₹${booking.subtotal.toLocaleString('en-IN')}`));
            row('Security Deposit (Refundable)', toRs(`₹${booking.deposit.toLocaleString('en-IN')}`));
            row('Platform Fee', 'Rs. 0  (Free)', false, [16, 185, 129]);

            doc.setDrawColor(209, 213, 219);
            doc.setLineWidth(0.5);
            doc.line(lm, y, rm, y);
            y += 6;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(17, 24, 39);
            doc.text('Grand Total', lm, y);
            doc.setTextColor(58, 91, 217);
            doc.text(toRs(`₹${booking.grandTotal.toLocaleString('en-IN')}`), rm, y, { align: 'right' });
            y += 16;

            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.3);
            doc.line(lm, y, rm, y);
            y += 7;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text('Thank you for renting with RentFlow — Smart Dynamic Rental Platform', W / 2, y, { align: 'center' });
            y += 5;
            doc.setFontSize(7);
            doc.setTextColor(200, 205, 215);
            doc.text('Payments secured by Razorpay  •  © 2026 RentFlow. All rights reserved.', W / 2, y, { align: 'center' });

            const fileNameSlug = booking.itemTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            doc.save(`rentflow_receipt_${fileNameSlug}.pdf`);

        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF. Make sure the page is fully loaded.');
        } finally {
            setPdfGenerating(false);
        }
    };

    // ── Logout ────────────────────────────────────────────────────────────────

    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('current_user');
        setIsLoggedIn(false);
        setCurrentUser(null);
        navigate(0);
    };

    // ── Derived display values ────────────────────────────────────────────────

    const firstName   = currentUser ? (currentUser.name || currentUser.username || currentUser.userfname || 'User').split(' ')[0] : 'User';
    const savedImage  = currentUser ? (localStorage.getItem('profileImage') || '../assets/profile.png') : '../assets/profile.png';
    const premiumText = currentUser?.isPremium ? 'Extend Premium' : 'Get Premium';

    const FILTERS = ['All', 'Pending', 'Active', 'Completed', 'Returned', 'Cancelled'];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <video className="bg-video" autoPlay muted loop playsInline>
                <source src="../../assets/video.mp4" type="video/mp4" />
            </video>
            <div className="overlay" />

            <div className="page-wrapper" onClick={() => setShowProfileMenu(false)}>

                {/* ── Navbar ── */}
                <header
                    className={`site-header${scrollState.hidden ? ' hidden-nav' : ''}${scrollState.scrolled ? ' scrolled' : ''}`}
                    id="site-header"
                >
                    <Link to="/" className="logo">Rent<span style={{ color: '#3a5bd9' }}>Flow</span></Link>
                    <nav className="nav-links" id="main-nav">
                        <Link to="/">Home</Link>
                        <Link to="/booking">Explore Rentals</Link>
                        <Link to="/booking-history" className="active">My Rentals</Link>
                        <Link to="/create-listing" style={{ color: 'var(--accent-blue-bright)', fontWeight: 600 }}>+ Post Listing</Link>
                        <Link to="/contact">Contact &amp; FAQ</Link>
                    </nav>
                    <div className="nav-cta" id="auth-buttons" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px' }}>
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
                                    <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); setShowProfileMenu(false); if (window.openWalletModal) window.openWalletModal(); }} style={{ padding: '10px 16px', color: '#b0b8c6', textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'block' }}>My Wallet</a>
                                    <Link to="/premium" style={{ padding: '10px 16px', color: '#eab308', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'block', whiteSpace: 'nowrap' }}>👑 {premiumText}</Link>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
                                    <a href="#" onClick={handleLogout} style={{ padding: '10px 16px', color: '#ef4444', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'block' }}>Logout</a>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* ── Main Content ── */}
                <main className="main-content">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">My Rentals</h1>
                            <p className="page-subtitle">Track and manage all your past and active rental bookings.</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-title">Total Rentals</div>
                            <div className="stat-value">{stats.total}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-title">Active</div>
                            <div className="stat-value" style={{ color: '#10b981' }}>{stats.active}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-title">Completed</div>
                            <div className="stat-value" style={{ color: '#60a5fa' }}>{stats.completed}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-title">Returned</div>
                            <div className="stat-value" style={{ color: '#a855f7' }}>{stats.returned}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-title">Total Spent</div>
                            <div className="stat-value">₹{stats.spent.toLocaleString('en-IN')}</div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="filter-tabs">
                        {FILTERS.map(f => (
                            <button
                                key={f}
                                className={`filter-tab${currentFilter === f ? ' active' : ''}`}
                                onClick={() => setCurrentFilter(f)}
                            >
                                {f === 'All' ? 'All Rentals' : f}
                            </button>
                        ))}
                    </div>

                    {/* Orders List */}
                    <div className="orders-list">
                        {displayedOrders.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                        <line x1="12" y1="22.08" x2="12" y2="12" />
                                    </svg>
                                </div>
                                <h3 className="empty-title">
                                    No {currentFilter === 'All' ? 'rentals' : currentFilter.toLowerCase() + ' rentals'} found
                                </h3>
                                <p className="empty-sub">Looks like you haven't booked anything yet.</p>
                                <Link to="/booking" className="btn-primary">Explore Rentals</Link>
                            </div>
                        ) : (
                            displayedOrders.map(item => {
                                const statusClass = `status-${item.status.toLowerCase()}`;
                                const dateStr = item.startDate
                                    ? `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`
                                    : 'Dates TBD';

                                return (
                                    <div className="order-card" key={item.id}>
                                        <div className="order-info-wrapper">
                                            <img src={item.itemImage} alt={item.itemTitle} className="order-img" />
                                            <div className="order-details">
                                                <h4 className="order-title">{item.itemTitle}</h4>
                                                <div className="order-meta">Lender: <span>{item.lenderName}</span></div>
                                                <div className="order-meta">Dates: <span>{dateStr} ({item.duration} days)</span></div>
                                                {item.status === 'Active' && (
                                                    <div className="order-meta" style={{ color: '#ef4444', fontWeight: 600 }}>
                                                        {countdowns[item.id] || 'Calculating...'}
                                                    </div>
                                                )}
                                                <div className={`order-status-badge ${statusClass}`}>{item.status}</div>
                                            </div>
                                        </div>

                                        <div className="order-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                            <div className="order-price">₹{item.grandTotal.toLocaleString('en-IN')}</div>
                                            {item.status === 'Approved' && (
                                                <button
                                                    className="btn-primary"
                                                    style={{ padding: '6px 12px', fontSize: 13 }}
                                                    onClick={() => initiatePayment(item.id)}
                                                >
                                                    Pay Now
                                                </button>
                                            )}
                                            <button
                                                className="btn-receipt"
                                                onClick={() => setReceiptModal({ show: true, booking: item })}
                                            >
                                                View Receipt
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </main>

                {/* ── Footer ── */}
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
                                <Link to="/contact">Contact &amp; FAQ</Link>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>©2026 RentFlow. All rights reserved.</p>
                        <p className="footer-tech">Built by Team RentFlow · Secured by Razorpay</p>
                    </div>
                </footer>
            </div>

            {/* ── Receipt Modal ── */}
            <div
                className={`modal-backdrop${receiptModal.show ? ' show' : ''}`}
                id="receipt-modal"
                onClick={e => { if (e.target.id === 'receipt-modal') setReceiptModal(m => ({ ...m, show: false })); }}
            >
                <div className="modal-card">
                    <button className="modal-close" onClick={() => setReceiptModal(m => ({ ...m, show: false }))}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    {receiptModal.booking && (
                        <div id="receipt-content">
                            <h3 className="modal-title">Rental Receipt</h3>

                            <div className="receipt-header">
                                <div className="receipt-item-name" id="receipt-item">
                                    {receiptModal.booking.itemTitle}
                                </div>
                                <div className="receipt-lender" id="receipt-lender">
                                    Lender: {receiptModal.booking.lenderName}
                                </div>
                                <div className="receipt-lender" id="receipt-dates" style={{ marginTop: 4 }}>
                                    {formatDate(receiptModal.booking.startDate)} to {formatDate(receiptModal.booking.endDate)}
                                </div>
                            </div>

                            <div className="receipt-breakdown">
                                <div className="receipt-row">
                                    <span>
                                        Base Rate (<span id="receipt-rate">₹{receiptModal.booking.rate.toLocaleString('en-IN')}</span>/day)
                                        {' '}× <span id="receipt-duration">{receiptModal.booking.duration}</span> days
                                    </span>
                                    <span id="receipt-subtotal">₹{receiptModal.booking.subtotal.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Security Deposit (Refundable)</span>
                                    <span id="receipt-deposit">₹{receiptModal.booking.deposit.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Platform Fee</span>
                                    <span style={{ color: '#10b981' }}>₹0 (Free)</span>
                                </div>
                                <div className="receipt-row total-row">
                                    <span>Grand Total</span>
                                    <span id="receipt-total">₹{receiptModal.booking.grandTotal.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        className="btn-primary-full"
                        id="btn-download-receipt"
                        onClick={downloadInvoice}
                        disabled={pdfGenerating}
                    >
                        {pdfGenerating ? 'Generating PDF...' : 'Download Invoice'}
                    </button>
                </div>
            </div>
        </>
    );
}
