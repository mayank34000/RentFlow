import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../css/index.css';
import './styles/booking-history.css';
import { useTheme, useScrollHide } from './useNavbarBehavior';
import { apiRequest, getBookingPaymentQuote, payBookingWithWallet, createBookingPaymentOrder, verifyBookingPayment, API_URL } from './services/api';
import Navbar from './components/Navbar';

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

function getCategoryFallback(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('elect') || cat.includes('gadget') || cat.includes('device') || cat.includes('camera')) return '/assets/electronics-clean.jpg';
    if (cat.includes('vehic') || cat.includes('car') || cat.includes('bike')) return '/assets/vehicles-clean.jpg';
    if (cat.includes('fash') || cat.includes('cloth') || cat.includes('wear')) return '/assets/fashion-clean.jpg';
    if (cat.includes('prop') || cat.includes('real') || cat.includes('furn') || cat.includes('apart')) return '/assets/property-clean.jpg';
    if (cat.includes('sport') || cat.includes('fit') || cat.includes('out') || cat.includes('party')) return '/assets/sports-clean.jpg';
    if (cat.includes('tool') || cat.includes('equip')) return '/assets/tools-clean.jpg';
    return '/assets/browse-rentals-ai.jpg';
}

function resolveImageUrl(img, category) {
    const fallback = getCategoryFallback(category);
    if (!img || img === '/assets/profile.png') return fallback;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    if (img.startsWith('/uploads')) return `${API_URL}${img}`;
    if (img.startsWith('uploads/')) return `${API_URL}/${img}`;
    return img;
}

/**
 * Maps a backend booking object (with populated listing/lender) to
 * the shape the existing UI cards expect.
 */
function mapBookingToUI(booking) {
    const listing = booking.listing || {};
    const lender = booking.lender || {};
    const renter = booking.renter || {};

    // Standard image resolution: handles both listing.image and listing.images array
    const rawImage = (Array.isArray(listing.images) && listing.images[0]) || listing.image;
    const itemImage = resolveImageUrl(rawImage, listing.category);

    // Listing title
    const itemTitle = listing.title || listing.name || 'Untitled Listing';

    // Lender & Renter names
    const lenderName = lender.name || lender.username || lender.userfname || 'Unknown Lender';
    const renterName = renter.name || renter.username || renter.userfname || 'Anonymous Renter';

    return {
        id: booking._id,
        listingId: listing._id || booking.listing,
        itemTitle,
        itemImage,
        category: listing.category || '',
        lenderName,
        renterName,
        startDate: booking.startDate,
        endDate: booking.endDate,
        duration: booking.totalDays,
        rate: booking.pricePerDay,
        subtotal: booking.subtotal,
        deposit: booking.securityDeposit,
        platformFee: (booking.platformFee && booking.platformFee > 0)
            ? booking.platformFee
            : Math.round((booking.subtotal || 0) * 0.02),
        grandTotal: (() => {
            const fee = (booking.platformFee && booking.platformFee > 0)
                ? booking.platformFee
                : Math.round((booking.subtotal || 0) * 0.02);
            const expected = (booking.subtotal || 0) + fee + (booking.securityDeposit || 0);
            return (booking.total && booking.total >= expected) ? booking.total : expected;
        })(),
        status: booking.status,
        paymentStatus: booking.paymentStatus || 'UNPAID',
        paymentDueAt: booking.paymentDueAt || null,
        rentalPaise: booking.rentalPaise || 0,
        depositPaise: booking.depositPaise || 0,
        fundsState: booking.fundsState || 'NONE',
        createdAt: booking.createdAt,
        returnedAt: booking.returnedAt || null,
        disputeReason: booking.disputeReason || '',
        completedAt: booking.completedAt || null,
    };
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
    const allBookingsRef = useRef([]);
    const [viewMode, setViewMode] = useState('borrowing'); // 'borrowing' | 'lending'
    const [currentFilter, setCurrentFilter] = useState('All');
    const [displayedOrders, setDisplayedOrders] = useState([]);

    // ── Action feedback state ─────────────────────────────────────────────────
    const [actionLoading, setActionLoading] = useState({});
    const [actionError, setActionError] = useState({});
    const [actionMessage, setActionMessage] = useState('');


    // ── API state ─────────────────────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(true);
    const [apiError, setApiError] = useState('');

    // ── Stats state ───────────────────────────────────────────────────────────
    const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, returned: 0, pending: 0, spent: 0 });

    // ── Countdown state (map: bookingId → string) ─────────────────────────────
    const [countdowns, setCountdowns] = useState({});

    // ── Receipt modal state ───────────────────────────────────────────────────
    const [receiptModal, setReceiptModal] = useState({ show: false, booking: null });
    const [pdfGenerating, setPdfGenerating] = useState(false);

    // ── Return modal state ────────────────────────────────────────────────────
    const [returnModal, setReturnModal] = useState({ show: false, bookingId: null, file: null, note: '', loading: false, error: '' });

    // ── Payment modal state (Pay After Seller Approval) ───────────────────────
    const [paymentModal, setPaymentModal] = useState({
        show: false,
        booking: null,
        quote: null,
        loading: false,
        actionLoading: false,
        error: '',
        success: ''
    });

    const navigate = useNavigate();

    // ── Helpers ───────────────────────────────────────────────────────────────

    const OTHER_STATUSES = ['Rejected', 'Cancelled', 'Expired', 'Overdue', 'Disputed'];

    const calcStats = useCallback((bookings) => {
        const activeCount    = bookings.reduce((c, b) => b.status === 'Active'    ? c + 1 : c, 0);
        const completedCount = bookings.reduce((c, b) => b.status === 'Completed' ? c + 1 : c, 0);
        const returnedCount  = bookings.reduce((c, b) => b.status === 'Returned'  ? c + 1 : c, 0);
        const pendingCount   = bookings.reduce((c, b) => b.status === 'Pending'   ? c + 1 : c, 0);
        const totalSpent     = bookings.reduce((s, b) => !['Cancelled', 'Rejected', 'Expired'].includes(b.status) ? s + (b.grandTotal || 0) : s, 0);

        setStats({
            total:     bookings.length,
            active:    activeCount,
            completed: completedCount,
            returned:  returnedCount,
            pending:   pendingCount,
            spent:     totalSpent
        });
    }, []);

    const buildDisplayedOrders = useCallback((bookings, filter) => {
        if (filter === 'All') {
            setDisplayedOrders(bookings);
        } else if (filter === 'Other') {
            setDisplayedOrders(bookings.filter(b => OTHER_STATUSES.includes(b.status)));
        } else {
            setDisplayedOrders(bookings.filter(b => b.status === filter));
        }
    }, []);

    const loadData = useCallback(async (mode) => {
        setIsLoading(true);
        setApiError('');
        setActionMessage('');

        const endpoint = mode === 'lending' ? '/api/bookings/lender' : '/api/bookings/my';
        try {
            const { data: responseData } = await apiRequest(endpoint);
            const rawBookings = Array.isArray(responseData?.data)
                ? responseData.data
                : Array.isArray(responseData) ? responseData : [];

            const mapped = rawBookings.map(mapBookingToUI);
            allBookingsRef.current = mapped;

            calcStats(mapped);
            buildDisplayedOrders(mapped, currentFilter);
        } catch (err) {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                setApiError('Cannot reach the server. Please try again.');
            } else if (err.status === 401) {
                setApiError('Authentication required. Please log in to view your bookings.');
            } else if (err.status >= 500) {
                setApiError('Unable to load bookings. Please try again later.');
            } else {
                setApiError(err.message || 'Unable to load bookings.');
            }
            allBookingsRef.current = [];
            setDisplayedOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentFilter, calcStats, buildDisplayedOrders]);

    // Existing hook 1: Initial auth check and data load
    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        const loggedIn = !!token && !!storedUser;
        setIsLoggedIn(loggedIn);

        if (loggedIn) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setIsLoggedIn(false);
                navigate('/login');
                return;
            }
            loadData('borrowing');
        } else {
            navigate('/login');
        }
    }, [loadData, navigate]);

    // Existing hook 2: Re-compute displayed orders when filter changes
    useEffect(() => {
        if (!isLoading && !apiError) {
            buildDisplayedOrders(allBookingsRef.current, currentFilter);
        }
    }, [currentFilter, isLoading, apiError, buildDisplayedOrders]);

    // ── Countdown timer ───────────────────────────────────────────────────────

    useEffect(() => {
        const tick = () => {
            const bookings = allBookingsRef.current;
            const newCountdowns = {};

            bookings.forEach(item => {
                if (item.status === 'Active' && item.endDate) {
                    const end = new Date(item.endDate);
                    const diff = end - new Date();

                    if (diff <= 0) {
                        newCountdowns[item.id] = 'Rental Ended';
                    } else {
                        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const s = Math.floor((diff % (1000 * 60)) / 1000);
                        newCountdowns[item.id] = `Time Left: ${d}d ${h}h ${m}m ${s}s`;
                    }
                }

                if (item.status === 'Approved' && item.paymentStatus === 'AWAITING_PAYMENT' && item.paymentDueAt) {
                    const due = new Date(item.paymentDueAt);
                    const diff = due - new Date();

                    if (diff <= 0) {
                        newCountdowns[`due_${item.id}`] = 'Payment Expired';
                    } else {
                        const h = Math.floor(diff / (1000 * 60 * 60));
                        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const s = Math.floor((diff % (1000 * 60)) / 1000);
                        newCountdowns[`due_${item.id}`] = `Pay within: ${h}h ${m}m ${s}s`;
                    }
                }
            });

            setCountdowns(newCountdowns);
        };

        const intervalId = setInterval(tick, 1000);
        return () => clearInterval(intervalId);
    }, []);

    // ── Mode Switch & Lifecycle Action Handlers (Stage 3) ───────────────────

    const handleModeChange = (mode) => {
        if (mode === viewMode) return;
        setViewMode(mode);
        setCurrentFilter('All');
        loadData(mode);
    };

    const handleCancelBooking = async (bookingId) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) return;
        setActionLoading(prev => ({ ...prev, [bookingId]: true }));
        setActionError(prev => ({ ...prev, [bookingId]: '' }));
        try {
            const { data } = await apiRequest(`/api/bookings/${bookingId}/cancel`, { method: 'PATCH' });
            if (data?.success) {
                setActionMessage('Booking cancelled successfully.');
                loadData(viewMode);
            } else {
                setActionError(prev => ({ ...prev, [bookingId]: data?.message || 'Failed to cancel.' }));
            }
        } catch (err) {
            setActionError(prev => ({ ...prev, [bookingId]: err.message || 'Error cancelling booking.' }));
        } finally {
            setActionLoading(prev => ({ ...prev, [bookingId]: false }));
        }
    };

    const handleApproveBooking = async (bookingId) => {
        setActionLoading(prev => ({ ...prev, [bookingId]: true }));
        setActionError(prev => ({ ...prev, [bookingId]: '' }));
        try {
            const { data } = await apiRequest(`/api/bookings/${bookingId}/approve`, { method: 'PATCH' });
            if (data?.success) {
                setActionMessage('Booking approved successfully. Conflicting pending requests were auto-rejected.');
                loadData(viewMode);
            } else {
                setActionError(prev => ({ ...prev, [bookingId]: data?.message || 'Failed to approve.' }));
            }
        } catch (err) {
            setActionError(prev => ({ ...prev, [bookingId]: err.message || 'Error approving booking.' }));
        } finally {
            setActionLoading(prev => ({ ...prev, [bookingId]: false }));
        }
    };

    const handleRejectBooking = async (bookingId) => {
        if (!window.confirm('Are you sure you want to reject this rental request?')) return;
        setActionLoading(prev => ({ ...prev, [bookingId]: true }));
        setActionError(prev => ({ ...prev, [bookingId]: '' }));
        try {
            const { data } = await apiRequest(`/api/bookings/${bookingId}/reject`, { method: 'PATCH' });
            if (data?.success) {
                setActionMessage('Booking rejected successfully.');
                loadData(viewMode);
            } else {
                setActionError(prev => ({ ...prev, [bookingId]: data?.message || 'Failed to reject.' }));
            }
        } catch (err) {
            setActionError(prev => ({ ...prev, [bookingId]: err.message || 'Error rejecting booking.' }));
        } finally {
            setActionLoading(prev => ({ ...prev, [bookingId]: false }));
        }
    };

    const handleConfirmReturn = async (bookingId) => {
        if (!window.confirm('Confirm that the item has been returned in good condition?')) return;
        setActionLoading(prev => ({ ...prev, [bookingId]: true }));
        setActionError(prev => ({ ...prev, [bookingId]: '' }));
        try {
            const { data } = await apiRequest(`/api/bookings/${bookingId}/confirm-return`, { method: 'PATCH' });
            if (data?.success) {
                setActionMessage('Return confirmed and booking completed successfully.');
                loadData(viewMode);
            } else {
                setActionError(prev => ({ ...prev, [bookingId]: data?.message || 'Failed to confirm return.' }));
            }
        } catch (err) {
            setActionError(prev => ({ ...prev, [bookingId]: err.message || 'Error confirming return.' }));
        } finally {
            setActionLoading(prev => ({ ...prev, [bookingId]: false }));
        }
    };


    // ── Payment Handlers (Pay After Seller Approval) ───────────────────────

    const handleOpenPaymentModal = async (item) => {
        setPaymentModal({ show: true, booking: item, quote: null, loading: true, actionLoading: false, error: '', success: '' });
        try {
            const res = await getBookingPaymentQuote(item.id);
            if (res?.success && res?.data) {
                setPaymentModal(prev => ({ ...prev, quote: res.data, loading: false }));
            } else {
                setPaymentModal(prev => ({ ...prev, loading: false, error: res?.message || 'Failed to fetch quote.' }));
            }
        } catch (err) {
            setPaymentModal(prev => ({ ...prev, loading: false, error: err.message || 'Error connecting to payment service.' }));
        }
    };

    const handlePayFromWallet = async (bookingId) => {
        setPaymentModal(prev => ({ ...prev, actionLoading: true, error: '', success: '' }));
        try {
            const res = await payBookingWithWallet(bookingId);
            if (res?.success) {
                setPaymentModal(prev => ({ ...prev, actionLoading: false, success: 'Payment successful! Rental confirmed.' }));
                setActionMessage('Payment confirmed from wallet! Your rental is locked in.');
                loadData(viewMode);
                setTimeout(() => {
                    setPaymentModal(prev => ({ ...prev, show: false }));
                }, 1200);
            } else {
                setPaymentModal(prev => ({ ...prev, actionLoading: false, error: res?.message || 'Payment failed.' }));
            }
        } catch (err) {
            setPaymentModal(prev => ({ ...prev, actionLoading: false, error: err.message || 'Error processing wallet payment.' }));
        }
    };

    const handlePayWithRazorpay = async (bookingId, useWallet = false) => {
        if (typeof window.Razorpay === 'undefined') {
            setPaymentModal(prev => ({ ...prev, error: 'Razorpay gateway is not loaded. Please refresh the page.' }));
            return;
        }

        setPaymentModal(prev => ({ ...prev, actionLoading: true, error: '', success: '' }));
        try {
            const orderRes = await createBookingPaymentOrder(bookingId, { useWallet });
            const orderData = orderRes?.data || orderRes;

            if (!orderData?.orderId) {
                setPaymentModal(prev => ({ ...prev, actionLoading: false, error: orderRes?.message || 'Failed to initialize payment gateway.' }));
                return;
            }

            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: 'RentFlow',
                description: `Rental Payment - ${paymentModal.booking?.itemTitle || 'Item'}`,
                image: '/assets/profile.png',
                order_id: orderData.orderId,
                handler: async function (response) {
                    try {
                        const verifyRes = await verifyBookingPayment(bookingId, response);
                        if (verifyRes?.success) {
                            setPaymentModal(prev => ({ ...prev, actionLoading: false, success: 'Payment verified and rental confirmed!' }));
                            setActionMessage('Payment successful via Razorpay! Your rental is confirmed.');
                            loadData(viewMode);
                            setTimeout(() => {
                                setPaymentModal(prev => ({ ...prev, show: false }));
                            }, 1200);
                        } else {
                            setPaymentModal(prev => ({ ...prev, actionLoading: false, error: verifyRes?.message || 'Verification failed.' }));
                        }
                    } catch (vErr) {
                        setPaymentModal(prev => ({ ...prev, actionLoading: false, error: vErr.message || 'Verification failed.' }));
                    }
                },
                prefill: {
                    name: currentUser?.name || '',
                    email: currentUser?.email || '',
                },
                theme: { color: '#f97316' },
                modal: {
                    ondismiss: function () {
                        setPaymentModal(prev => ({ ...prev, actionLoading: false }));
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
                setPaymentModal(prev => ({ ...prev, actionLoading: false, error: resp.error?.description || 'Payment failed.' }));
            });
            rzp.open();
        } catch (err) {
            setPaymentModal(prev => ({ ...prev, actionLoading: false, error: err.message || 'Payment initiation failed.' }));
        }
    };

    // ── Return Item ───────────────────────────────────────────────────────────

    const submitReturn = async (e) => {
        e.preventDefault();
        if (!returnModal.bookingId) return;

        setReturnModal(prev => ({ ...prev, loading: true, error: '' }));

        try {
            const formData = new FormData();
            if (returnModal.note) formData.append('returnNote', returnModal.note);
            if (returnModal.file) formData.append('returnPhoto', returnModal.file);

            const { data } = await apiRequest(`/api/bookings/${returnModal.bookingId}/return`, {
                method: 'PATCH',
                body: formData
            });

            if (data?.success) {
                setReturnModal({ show: false, bookingId: null, file: null, note: '', loading: false, error: '' });
                window.location.reload();
            } else {
                setReturnModal(prev => ({ ...prev, error: data?.message || 'Failed to return item.' }));
            }
        } catch (err) {
            setReturnModal(prev => ({ ...prev, error: err.message || 'An error occurred.' }));
        } finally {
            setReturnModal(prev => ({ ...prev, loading: false }));
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
            const feeVal = (booking.platformFee && booking.platformFee > 0)
                ? booking.platformFee
                : Math.round((booking.subtotal || 0) * 0.02);
            row('Platform Service Fee (2%)', toRs(`₹${feeVal.toLocaleString('en-IN')}`), false, [55, 65, 81]);

            doc.setDrawColor(209, 213, 219);
            doc.setLineWidth(0.5);
            doc.line(lm, y, rm, y);
            y += 6;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(17, 24, 39);
            doc.text('Grand Total', lm, y);
            doc.setTextColor(58, 91, 217);
            const expectedTotal = (booking.subtotal || 0) + feeVal + (booking.deposit || 0);
            const finalPdfTotal = (booking.grandTotal && booking.grandTotal >= expectedTotal)
                ? booking.grandTotal
                : expectedTotal;
            doc.text(toRs(`₹${finalPdfTotal.toLocaleString('en-IN')}`), rm, y, { align: 'right' });
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

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setIsLoggedIn(false);
    setCurrentUser(null);

    navigate('/login');
};

    // ── Derived display values ────────────────────────────────────────────────

    const firstName = currentUser ? (currentUser.name || currentUser.username || currentUser.userfname || 'User').split(' ')[0] : 'User';
    const savedImage = currentUser ? (localStorage.getItem('profileImage') || '../assets/profile.png') : '../assets/profile.png';
    const premiumText = (currentUser && currentUser.isPro) ? 'Pro Member' : 'Premium';

    const FILTERS = ['All', 'Pending', 'Approved', 'Active', 'Returned', 'Completed', 'Other'];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <video className="bg-video" autoPlay muted loop playsInline>
                <source src="../../assets/video.mp4" type="video/mp4" />
            </video>
            <div className="overlay" />

            <div className="page-wrapper" onClick={() => setShowProfileMenu(false)}>

                {/* ── Navbar ── */}
                <Navbar />

                {/* ── Main Content ── */}
                <main className="main-content">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">My Rentals</h1>
                            <p className="page-subtitle">Track and manage your rental requests and listed items.</p>
                        </div>
                    </div>

                    {/* Mode Toggle: Borrowing vs Lending */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                        <button
                            type="button"
                            className={`mode-toggle-btn borrowing-btn ${viewMode === 'borrowing' ? 'active' : ''}`}
                            onClick={() => handleModeChange('borrowing')}
                        >
                            Borrowing (My Bookings)
                        </button>
                        <button
                            type="button"
                            className={`mode-toggle-btn lending-btn ${viewMode === 'lending' ? 'active' : ''}`}
                            onClick={() => handleModeChange('lending')}
                        >
                            Lending (My Listed Items)
                        </button>
                    </div>

                    {actionMessage && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
                            {actionMessage}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="stats-grid">
                        {viewMode === 'borrowing' ? (
                            <>
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
                            </>
                        ) : (
                            <>
                                <div className="stat-card">
                                    <div className="stat-title">Pending Requests</div>
                                    <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.pending}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-title">Active Rentals</div>
                                    <div className="stat-value" style={{ color: '#10b981' }}>{stats.active}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-title">Completed</div>
                                    <div className="stat-value" style={{ color: '#60a5fa' }}>{stats.completed}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-title">Total Listed Bookings</div>
                                    <div className="stat-value">{stats.total}</div>
                                </div>
                            </>
                        )}
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
                        {isLoading ? (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                        <line x1="12" y1="22.08" x2="12" y2="12" />
                                    </svg>
                                </div>
                                <h3 className="empty-title">Loading bookings...</h3>
                                <p className="empty-sub">Please wait while we fetch the records.</p>
                            </div>
                        ) : apiError ? (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                </div>
                                <h3 className="empty-title">Unable to load bookings</h3>
                                <p className="empty-sub">{apiError}</p>
                            </div>
                        ) : displayedOrders.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                        <line x1="12" y1="22.08" x2="12" y2="12" />
                                    </svg>
                                </div>
                                <h3 className="empty-title">
                                    No {currentFilter === 'All' ? (viewMode === 'borrowing' ? 'rentals' : 'items') : currentFilter.toLowerCase()} found
                                </h3>
                                <p className="empty-sub">
                                    {viewMode === 'borrowing' ? "Looks like you haven't booked anything in this category." : "No rental requests for your listed items in this category."}
                                </p>
                                {viewMode === 'borrowing' && (
                                    <Link to="/booking" className="btn-primary">Explore Rentals</Link>
                                )}
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
                                            <img
                                                src={item.itemImage}
                                                alt={item.itemTitle}
                                                className="order-img"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    const fb = getCategoryFallback(item.category);
                                                    if (e.target.src !== fb && !e.target.src.endsWith(fb)) {
                                                        e.target.src = fb;
                                                    }
                                                }}
                                            />
                                            <div className="order-details">
                                                <h4 className="order-title">{item.itemTitle}</h4>
                                                <div className="order-meta">
                                                    {viewMode === 'borrowing' ? (
                                                        <>Lender: <span>{item.lenderName}</span></>
                                                    ) : (
                                                        <>Renter: <span>{item.renterName}</span></>
                                                    )}
                                                </div>
                                                <div className="order-meta">Dates: <span>{dateStr} ({item.duration} days)</span></div>
                                                {item.status === 'Approved' && item.paymentStatus === 'AWAITING_PAYMENT' && (
                                                    <div className="order-meta" style={{ color: '#f59e0b', fontWeight: 600 }}>
                                                        ⏳ Payment due: {countdowns['due_' + item.id] || 'Calculating...'}
                                                    </div>
                                                )}
                                                {item.status === 'Approved' && item.paymentStatus === 'PAID' && (
                                                    <div className="order-meta" style={{ color: '#10b981', fontWeight: 600 }}>
                                                        ✅ Paid · Ready for rental start
                                                    </div>
                                                )}
                                                {item.status === 'Active' && (
                                                    <div className="order-meta" style={{ color: '#2563eb', fontWeight: 600 }}>
                                                        ⏱️ {countdowns[item.id] || 'Calculating...'}
                                                    </div>
                                                )}
                                                {item.status === 'Returned' && (
                                                    <div className="order-meta" style={{ color: '#3b82f6', fontWeight: 600 }}>
                                                        📦 Item Returned · Awaiting lender inspection & deposit release
                                                    </div>
                                                )}
                                                {item.status === 'Completed' && (
                                                    <div className="order-meta" style={{ color: '#10b981', fontWeight: 600 }}>
                                                        {viewMode === 'borrowing'
                                                            ? `✅ Rental Ended · Security deposit (₹${(item.deposit || 0).toLocaleString('en-IN')}) refunded to wallet`
                                                            : `✅ Rental Completed · Earnings credited to wallet`}
                                                    </div>
                                                )}
                                                {item.status === 'Overdue' && (
                                                    <div className="order-meta" style={{ color: '#ef4444', fontWeight: 600 }}>
                                                        ⚠️ Rental is Overdue
                                                    </div>
                                                )}
                                                {item.status === 'Disputed' && (
                                                    <div className="order-meta" style={{ color: '#f59e0b', fontWeight: 600 }}>
                                                        ⚠️ Disputed: {item.disputeReason || 'Damage reported'}
                                                    </div>
                                                )}
                                                <div className={`order-status-badge ${statusClass}`}>
                                                    {item.status === 'Approved'
                                                        ? (item.paymentStatus === 'PAID' ? 'Approved (Paid)' : 'Approved (Payment Due)')
                                                        : item.status}
                                                </div>
                                                {actionError[item.id] && (
                                                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 4 }}>
                                                        {actionError[item.id]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="order-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                            <div className="order-price">₹{item.grandTotal.toLocaleString('en-IN')}</div>
                                            
                                            {/* Actions for Borrower */}
                                            {viewMode === 'borrowing' && (
                                                <>
                                                    {item.status === 'Approved' && item.paymentStatus === 'AWAITING_PAYMENT' && (
                                                        <button
                                                            className="btn-primary"
                                                            style={{
                                                                padding: '8px 16px',
                                                                fontSize: 13,
                                                                backgroundColor: '#f97316',
                                                                borderColor: '#f97316',
                                                                color: '#fff',
                                                                borderRadius: 6,
                                                                cursor: 'pointer',
                                                                fontWeight: 600,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 6
                                                            }}
                                                            onClick={() => handleOpenPaymentModal(item)}
                                                        >
                                                            💳 Pay Now · ₹{item.grandTotal.toLocaleString('en-IN')}
                                                        </button>
                                                    )}
                                                    {['Pending', 'Approved'].includes(item.status) && (
                                                        <button
                                                            className="btn-danger"
                                                            style={{ padding: '6px 12px', fontSize: 13, backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                                            onClick={() => handleCancelBooking(item.id)}
                                                            disabled={actionLoading[item.id]}
                                                        >
                                                            {actionLoading[item.id] ? 'Cancelling...' : 'Cancel Booking'}
                                                        </button>
                                                    )}
                                                    {['Active', 'Overdue'].includes(item.status) && (
                                                        <button
                                                            className="btn-primary"
                                                            style={{ padding: '6px 12px', fontSize: 13, backgroundColor: '#a855f7', borderColor: '#a855f7' }}
                                                            onClick={() => setReturnModal({ show: true, bookingId: item.id, file: null, note: '', loading: false, error: '' })}
                                                        >
                                                            Return Item
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            {/* Actions for Lender */}
                                            {viewMode === 'lending' && (
                                                <>
                                                    {item.status === 'Pending' && (
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <button
                                                                className="btn-primary"
                                                                style={{ padding: '6px 12px', fontSize: 13, backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff', borderRadius: 6, cursor: 'pointer' }}
                                                                onClick={() => handleApproveBooking(item.id)}
                                                                disabled={actionLoading[item.id]}
                                                            >
                                                                {actionLoading[item.id] ? 'Approving...' : 'Approve'}
                                                            </button>
                                                            <button
                                                                className="btn-danger"
                                                                style={{ padding: '6px 12px', fontSize: 13, backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff', borderRadius: 6, cursor: 'pointer' }}
                                                                onClick={() => handleRejectBooking(item.id)}
                                                                disabled={actionLoading[item.id]}
                                                            >
                                                                {actionLoading[item.id] ? 'Rejecting...' : 'Reject'}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {item.status === 'Approved' && (
                                                        <div style={{ fontSize: '0.85rem', color: item.paymentStatus === 'PAID' ? '#10b981' : '#f59e0b', fontWeight: 500, textAlign: 'right' }}>
                                                            {item.paymentStatus === 'PAID' ? '✅ Paid · Ready for handover' : '⏳ Awaiting renter payment'}
                                                        </div>
                                                    )}
                                                    {item.status === 'Returned' && (
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <button
                                                                className="btn-primary"
                                                                style={{ padding: '6px 12px', fontSize: 13, backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff', borderRadius: 6, cursor: 'pointer' }}
                                                                onClick={() => handleConfirmReturn(item.id)}
                                                                disabled={actionLoading[item.id]}
                                                            >
                                                                {actionLoading[item.id] ? 'Confirming...' : 'Confirm Return'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
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
                                    <span>Platform Service Fee (2%)</span>
                                    <span id="receipt-platform-fee">₹{(() => {
                                        const fee = (receiptModal.booking.platformFee && receiptModal.booking.platformFee > 0)
                                            ? receiptModal.booking.platformFee
                                            : Math.round((receiptModal.booking.subtotal || 0) * 0.02);
                                        return fee.toLocaleString('en-IN');
                                    })()}</span>
                                </div>
                                <div className="receipt-row total-row">
                                    <span>Grand Total</span>
                                    <span id="receipt-total">₹{(() => {
                                        const fee = (receiptModal.booking.platformFee && receiptModal.booking.platformFee > 0)
                                            ? receiptModal.booking.platformFee
                                            : Math.round((receiptModal.booking.subtotal || 0) * 0.02);
                                        const expected = (receiptModal.booking.subtotal || 0) + fee + (receiptModal.booking.deposit || 0);
                                        const total = (receiptModal.booking.grandTotal && receiptModal.booking.grandTotal >= expected)
                                            ? receiptModal.booking.grandTotal
                                            : expected;
                                        return total.toLocaleString('en-IN');
                                    })()}</span>
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

            {/* ── Return Modal ── */}
            <div
                className={`modal-backdrop${returnModal.show ? ' show' : ''}`}
                id="return-modal"
                onClick={e => { if (e.target.id === 'return-modal') setReturnModal(m => ({ ...m, show: false })); }}
            >
                <div className="modal-card">
                    <button className="modal-close" onClick={() => setReturnModal(m => ({ ...m, show: false }))} disabled={returnModal.loading}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    <h3 className="modal-title">Return Item</h3>
                    {returnModal.error && (
                        <div style={{ color: '#ef4444', marginBottom: 15, fontSize: '0.9rem' }}>{returnModal.error}</div>
                    )}
                    <form onSubmit={submitReturn}>
                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 5, color: '#b0b8c6', fontSize: '0.9rem' }}>Return Photo (Required)</label>
                            <input
                                type="file"
                                accept="image/*"
                                required
                                onChange={e => setReturnModal(prev => ({ ...prev, file: e.target.files[0] }))}
                                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                            />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', marginBottom: 5, color: '#b0b8c6', fontSize: '0.9rem' }}>Return Note (Optional)</label>
                            <textarea
                                rows="3"
                                placeholder="Condition of the item upon return..."
                                value={returnModal.note}
                                onChange={e => setReturnModal(prev => ({ ...prev, note: e.target.value }))}
                                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                            ></textarea>
                        </div>
                        <button
                            type="submit"
                            className="btn-primary-full"
                            disabled={returnModal.loading}
                        >
                            {returnModal.loading ? 'Submitting...' : 'Confirm Return'}
                        </button>
                    </form>
                </div>
            </div>


            {/* ── Payment Modal (Pay After Approval) ── */}
            <div
                className={`modal-backdrop${paymentModal.show ? ' show' : ''}`}
                id="payment-modal"
                onClick={e => { if (e.target.id === 'payment-modal' && !paymentModal.actionLoading) setPaymentModal(m => ({ ...m, show: false })); }}
            >
                <div className="modal-card" style={{ maxWidth: 520 }}>
                    <button
                        className="modal-close"
                        onClick={() => setPaymentModal(m => ({ ...m, show: false }))}
                        disabled={paymentModal.actionLoading}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    <h3 className="modal-title">Pay for Rental</h3>
                    {paymentModal.booking && (
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 16 }}>
                            Lender approved your request for <strong style={{ color: '#fff' }}>{paymentModal.booking.itemTitle}</strong>. Complete payment to confirm and lock in your rental.
                        </p>
                    )}

                    {paymentModal.error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.88rem' }}>
                            ⚠️ {paymentModal.error}
                        </div>
                    )}

                    {paymentModal.success && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.88rem' }}>
                            ✅ {paymentModal.success}
                        </div>
                    )}

                    {paymentModal.loading ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                            Calculating payment quote...
                        </div>
                    ) : paymentModal.quote ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Cost Breakdown */}
                            <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: '#cbd5e1' }}>
                                    <span>Rental Fee ({paymentModal.quote.rentalDays} days):</span>
                                    <span style={{ fontWeight: 600 }}>₹{(paymentModal.quote.rentalPaise / 100).toLocaleString('en-IN')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: '#cbd5e1' }}>
                                    <span>Refundable Security Deposit:</span>
                                    <span style={{ fontWeight: 600 }}>₹{(paymentModal.quote.depositPaise / 100).toLocaleString('en-IN')}</span>
                                </div>
                                {paymentModal.quote.platformFeePaise > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        <span>Platform Fee:</span>
                                        <span style={{ fontWeight: 600 }}>₹{(paymentModal.quote.platformFeePaise / 100).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: '#f97316' }}>
                                    <span>Total Due:</span>
                                    <span>₹{(paymentModal.quote.totalAmountPaise / 100).toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Wallet Balance Card */}
                            <div style={{ background: 'rgba(59, 130, 246, 0.08)', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#93c5fd' }}>Available Wallet Balance</div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>
                                        ₹{(paymentModal.quote.walletBalancePaise / 100).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                {paymentModal.quote.canPayWithWallet ? (
                                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', padding: '4px 8px', borderRadius: 6 }}>
                                        Sufficient Balance
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', padding: '4px 8px', borderRadius: 6 }}>
                                        Shortfall: ₹{(paymentModal.quote.shortfallPaise / 100).toLocaleString('en-IN')}
                                    </span>
                                )}
                            </div>

                            {/* Payment Deadline Countdown */}
                            {paymentModal.booking?.id && countdowns['due_' + paymentModal.booking.id] && (
                                <div style={{ fontSize: '0.85rem', color: '#f59e0b', textAlign: 'center', fontWeight: 500 }}>
                                    ⏳ Payment deadline: {countdowns['due_' + paymentModal.booking.id]}
                                </div>
                            )}

                            {/* Payment Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                                {/* Option 1: Pay 100% from Wallet */}
                                <button
                                    type="button"
                                    className="btn-primary-full"
                                    style={{
                                        backgroundColor: paymentModal.quote.canPayWithWallet ? '#10b981' : '#334155',
                                        borderColor: paymentModal.quote.canPayWithWallet ? '#10b981' : '#334155',
                                        cursor: paymentModal.quote.canPayWithWallet ? 'pointer' : 'not-allowed',
                                        opacity: paymentModal.quote.canPayWithWallet ? 1 : 0.65
                                    }}
                                    disabled={!paymentModal.quote.canPayWithWallet || paymentModal.actionLoading}
                                    onClick={() => handlePayFromWallet(paymentModal.booking.id)}
                                >
                                    {paymentModal.actionLoading ? 'Processing...' : `Pay Full from Wallet (₹${(paymentModal.quote.totalAmountPaise / 100).toLocaleString('en-IN')})`}
                                </button>

                                {/* Option 2: Split Payment (Use wallet + pay remainder via Razorpay) */}
                                {paymentModal.quote.walletBalancePaise > 0 && !paymentModal.quote.canPayWithWallet && (
                                    <button
                                        type="button"
                                        className="btn-primary-full"
                                        style={{ backgroundColor: '#6366f1', borderColor: '#6366f1' }}
                                        disabled={paymentModal.actionLoading}
                                        onClick={() => handlePayWithRazorpay(paymentModal.booking.id, true)}
                                    >
                                        {paymentModal.actionLoading ? 'Connecting...' : `Split: Use Wallet (₹${(paymentModal.quote.walletBalancePaise / 100).toLocaleString('en-IN')}) + Pay Remainder (₹${(paymentModal.quote.shortfallPaise / 100).toLocaleString('en-IN')})`}
                                    </button>
                                )}

                                {/* Option 3: Pay Full via Razorpay */}
                                <button
                                    type="button"
                                    className="btn-primary-full"
                                    style={{ backgroundColor: '#f97316', borderColor: '#f97316' }}
                                    disabled={paymentModal.actionLoading}
                                    onClick={() => handlePayWithRazorpay(paymentModal.booking.id, false)}
                                >
                                    {paymentModal.actionLoading ? 'Connecting Gateway...' : `Pay Full via Razorpay (₹${(paymentModal.quote.totalAmountPaise / 100).toLocaleString('en-IN')})`}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}
