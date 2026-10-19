import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthUser, getPremiumQuote, payPremiumWithWallet, createPaymentOrder, verifyPayment } from './services/api';
import Navbar from './components/Navbar';
import { useTheme } from './useNavbarBehavior';
import './styles/premium.css';
import Footer from './components/Footer';

export default function Premium() {
    useTheme();
    const navigate = useNavigate();
    const [user, setUser] = useState(getAuthUser());

    // Quote and payment states
    const [quote, setQuote] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Approved Hook: Load quote data on mount
    useEffect(() => {
        const currentUser = getAuthUser();
        if (!currentUser) {
            navigate('/login?redirect=/premium');
            return;
        }
        setUser(currentUser);
        loadQuote();
    }, [navigate]);

    const loadQuote = async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
            const res = await getPremiumQuote();
            if (res?.success && res?.data) {
                setQuote(res.data);
            } else {
                setErrorMessage(res?.message || 'Failed to load membership details.');
            }
        } catch (err) {
            setErrorMessage(err.message || 'Error connecting to subscription service.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatRupees = (paise) => {
        if (typeof paise !== 'number') return '0.00';
        return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // ── Payment Handlers ───────────────────────────────────────────────────────

    // Option 1: Pay full ₹300 using Wallet Balance
    const handlePayWallet = async () => {
        setActionLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const res = await payPremiumWithWallet();
            if (res?.success && res?.user) {
                localStorage.setItem('user', JSON.stringify(res.user));
                setUser(res.user);
                setSuccessMessage('Payment successful! Welcome to RentFlow Premium.');
                window.dispatchEvent(new Event('storage'));
                await loadQuote();
            } else {
                setErrorMessage(res?.message || 'Wallet payment failed.');
            }
        } catch (err) {
            setErrorMessage(err.message || 'Error processing wallet payment.');
        } finally {
            setActionLoading(false);
        }
    };

    // Option 2 & 3: Pay via Razorpay (Full ₹300 OR Split Shortfall)
    const handlePayRazorpay = async (useWallet = false) => {
        if (typeof window.Razorpay === 'undefined') {
            setErrorMessage('Payment gateway is still loading. Please refresh the page and try again.');
            return;
        }

        setActionLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            // 1. Create backend order
            const orderRes = await createPaymentOrder({ useWallet });
            const orderData = orderRes?.data || orderRes;

            if (!orderData || !orderData.orderId) {
                setErrorMessage(orderRes?.message || 'Failed to initialize payment order.');
                setActionLoading(false);
                return;
            }

            // 2. Configure Razorpay using authoritative backend details
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                order_id: orderData.orderId,
                name: 'RentFlow',
                description: useWallet
                    ? `Premium Pass (Split: Pay Shortfall ₹${formatRupees(orderData.amount)})`
                    : 'Premium Pass - 1 Month Access (₹300)',
                handler: async function (response) {
                    try {
                        // 3. Verify payment on backend
                        const verifyRes = await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            useWallet
                        });

                        if (verifyRes?.success && verifyRes?.user) {
                            localStorage.setItem('user', JSON.stringify(verifyRes.user));
                            setUser(verifyRes.user);
                            setSuccessMessage('Payment Verified! Welcome to RentFlow Premium.');
                            window.dispatchEvent(new Event('storage'));
                            await loadQuote();
                        } else {
                            setErrorMessage(verifyRes?.message || 'Payment verification failed.');
                        }
                    } catch (verifyError) {
                        console.error('Verification Error:', verifyError);
                        setErrorMessage(verifyError.message || 'Payment verification error.');
                    } finally {
                        setActionLoading(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setActionLoading(false);
                    }
                },
                prefill: {
                    name: user?.name || 'RentFlow User',
                    email: user?.email || 'user@example.com'
                },
                theme: {
                    color: '#f97316'
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
                console.error('Razorpay Error Details:', resp.error);
                setErrorMessage(resp.error?.description || 'Payment Failed.');
                setActionLoading(false);
            });
            rzp.open();
        } catch (error) {
            console.error('Payment initiation error:', error);
            setErrorMessage(error.message || 'Failed to start payment process.');
            setActionLoading(false);
        }
    };

    return (
        <div className="premium-page-wrapper">
            <Navbar />

            {/* Hero Section */}
            <header className="premium-hero-section">
                <div className="premium-hero-badge">
                    <span className="premium-hero-badge-dot"></span>
                    RENTFLOW PRO PASS
                </div>
                <h1 className="premium-hero-title">
                    Elevate Your Experience with <span>RentFlow Premium</span>
                </h1>
                <p className="premium-hero-subtitle">
                    Unlock direct contact access, unlimited listings, verified PRO status, and priority support to rent and earn with zero friction.
                </p>
                <div className="premium-hero-actions">
                    <a href="#pricing-card" className="btn-primary-cta">
                        {quote?.isCurrentlyActive ? 'View Active Plan' : 'Upgrade to Pro — ₹300/mo'}
                    </a>
                    <a href="#features-section" className="btn-secondary-cta">
                        Explore Features ↓
                    </a>
                </div>
            </header>

            {/* Notifications */}
            <div className="premium-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
                {successMessage && (
                    <div className="premium-toast-success">
                        {successMessage}
                    </div>
                )}
                {errorMessage && (
                    <div className="premium-toast-error">
                        {errorMessage}
                    </div>
                )}
            </div>

            {/* Feature Cards Section */}
            <section id="features-section" className="premium-features-section">
                <div className="premium-section-header">
                    <h2 className="premium-section-title">Why Upgrade to <span>Premium</span></h2>
                    <p className="premium-section-subtitle">Real marketplace advantages verified across RentFlow.</p>
                </div>

                <div className="premium-features-grid">
                    <div className="premium-feature-card">
                        <div className="premium-feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </div>
                        <h3>Direct Contact Unmasked</h3>
                        <p>View verified phone numbers directly on listings and bookings. Call or message lenders immediately without intermediaries.</p>
                    </div>

                    <div className="premium-feature-card">
                        <div className="premium-feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        </div>
                        <h3>Unlimited Listings</h3>
                        <p>Post and manage as many rental listings as you want across Electronics, Vehicles, Fashion, Property, Sports, and Tools.</p>
                    </div>

                    <div className="premium-feature-card">
                        <div className="premium-feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        </div>
                        <h3>Verified PRO Identity Badge</h3>
                        <p>Showcase a verified PRO status badge in your navigation and profile dropdown, building instant credibility and trust.</p>
                    </div>

                    <div className="premium-feature-card">
                        <div className="premium-feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <h3>Priority Customer Support</h3>
                        <p>Access expedited ticket resolution and direct assistance whenever you have questions regarding bookings or payments.</p>
                    </div>
                </div>
            </section>

            {/* Free vs Premium Comparison Table */}
            <section className="premium-comparison-section">
                <div className="premium-section-header">
                    <h2 className="premium-section-title">Free vs <span>Premium</span></h2>
                    <p className="premium-section-subtitle">Clear side-by-side comparison of plan benefits.</p>
                </div>

                <div className="premium-table-wrapper">
                    <table className="premium-comparison-table">
                        <thead>
                            <tr>
                                <th>Plan Benefits</th>
                                <th>Free Member</th>
                                <th className="highlight-column">Pro Member</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Monthly Cost</td>
                                <td>₹0</td>
                                <td className="highlight-column"><strong>₹300 / 30 days</strong></td>
                            </tr>
                            <tr>
                                <td>Lender Contact Phone</td>
                                <td><span className="badge-locked">Masked</span></td>
                                <td className="highlight-column"><span className="badge-unlocked">✓ Direct &amp; Unmasked</span></td>
                            </tr>
                            <tr>
                                <td>Payment Channels</td>
                                <td>—</td>
                                <td className="highlight-column"><span className="badge-unlocked">✓ Wallet, Razorpay &amp; Split</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Pricing Card & Upgrade Section */}
            <section id="pricing-card" className="premium-pricing-section">
                <div className="premium-container">
                    <div className="premium-pricing-card">
                        <div className="premium-plan-badge">
                            {quote?.isCurrentlyActive ? 'ACTIVE MEMBER' : 'PRO PASS'}
                        </div>
                        <h2>Monthly Subscription</h2>
                        <div className="premium-price">₹300<span>/mo</span></div>

                        {quote?.isCurrentlyActive && (
                            <div className="premium-active-banner">
                                Your Premium membership is active until <strong>{new Date(quote.premiumUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                            </div>
                        )}

                        <ul className="premium-benefits">
                            <li>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Post unlimited listings
                            </li>
                            <li>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Unlock contact of seller
                            </li>
                            <li>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Priority customer support
                            </li>
                            <li>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Advanced listing analytics
                            </li>
                        </ul>

                        {/* Available Wallet Info */}
                        {quote && (
                            <div className="premium-wallet-card">
                                <div style={{ color: 'var(--text-secondary)' }}>Available Wallet Balance:</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginTop: 2 }}>
                                    ₹{formatRupees(quote.availableBalancePaise)}
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        {quote?.isCurrentlyActive ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#10b981', textAlign: 'center' }}>
                                    Extend Your Pro Membership (+30 Days)
                                </div>
                                {/* Option 1: Extend with Wallet */}
                                {quote?.canPayWithWallet && (
                                    <button
                                        className="btn-upgrade"
                                        onClick={handlePayWallet}
                                        disabled={actionLoading || isLoading}
                                        style={{ background: '#10b981', borderColor: '#10b981' }}
                                    >
                                        {actionLoading ? 'Processing...' : 'Extend +30 Days with Wallet (₹300)'}
                                    </button>
                                )}

                                {/* Option 2: Split Payment */}
                                {quote && quote.availableBalancePaise > 0 && !quote.canPayWithWallet && (
                                    <button
                                        className="btn-upgrade"
                                        onClick={() => handlePayRazorpay(true)}
                                        disabled={actionLoading || isLoading}
                                        style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                                    >
                                        {actionLoading
                                            ? 'Opening Gateway...'
                                            : `Extend: Wallet (₹${formatRupees(quote.availableBalancePaise)}) + Pay ₹${formatRupees(quote.shortfallPaise)}`}
                                    </button>
                                )}

                                {/* Option 3: Direct Razorpay (Full ₹300) */}
                                <button
                                    className="btn-upgrade"
                                    onClick={() => handlePayRazorpay(false)}
                                    disabled={actionLoading || isLoading}
                                    style={{ background: quote?.canPayWithWallet ? '#334155' : undefined }}
                                >
                                    {actionLoading ? 'Opening Gateway...' : 'Extend +30 Days via Razorpay (₹300)'}
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                                {/* Option 1: Pay full with Wallet */}
                                {quote?.canPayWithWallet && (
                                    <button
                                        className="btn-upgrade"
                                        onClick={handlePayWallet}
                                        disabled={actionLoading || isLoading}
                                        style={{ background: '#10b981', borderColor: '#10b981' }}
                                    >
                                        {actionLoading ? 'Processing...' : 'Pay ₹300 with Wallet Balance'}
                                    </button>
                                )}

                                {/* Option 2: Split Payment */}
                                {quote && quote.availableBalancePaise > 0 && !quote.canPayWithWallet && (
                                    <button
                                        className="btn-upgrade"
                                        onClick={() => handlePayRazorpay(true)}
                                        disabled={actionLoading || isLoading}
                                        style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                                    >
                                        {actionLoading
                                            ? 'Opening Gateway...'
                                            : `Use Wallet (₹${formatRupees(quote.availableBalancePaise)}) + Pay ₹${formatRupees(quote.shortfallPaise)}`}
                                    </button>
                                )}

                                {/* Option 3: Direct Razorpay (Full ₹300) */}
                                <button
                                    className="btn-upgrade"
                                    onClick={() => handlePayRazorpay(false)}
                                    disabled={actionLoading || isLoading}
                                    style={{ background: quote?.canPayWithWallet ? '#334155' : undefined }}
                                >
                                    {actionLoading ? 'Opening Gateway...' : 'Pay Full ₹300 via Razorpay'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="premium-final-cta">
                <div className="premium-final-cta-card">
                    <h2>Ready to maximize your rental potential?</h2>
                    <p>Join active RentFlow Pro members enjoying direct contacts, unlimited listings, and verified trust.</p>
                    <a href="#pricing-card" className="btn-primary-cta" style={{ display: 'inline-block', width: 'auto', padding: '14px 36px' }}>
                        {quote?.isCurrentlyActive ? 'View Subscription' : 'Upgrade to Pro Now'}
                    </a>
                </div>
            </section>

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <Link to="/" className="premium-back-link">← Back to Dashboard</Link>
            </div>

            <Footer />
        </div>
    );
}
