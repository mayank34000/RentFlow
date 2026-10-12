import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthUser, getPremiumQuote, payPremiumWithWallet, createPaymentOrder, verifyPayment } from './services/api';
import Navbar from './components/Navbar';
import { useTheme } from './useNavbarBehavior';
import './styles/premium.css';

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

            <div className="premium-container" style={{ marginTop: '40px' }}>
                <header className="premium-header">
                    <h1>RentFlow <span>Premium</span></h1>
                    <p>Unlock priority support, advanced analytics, and zero-fee listings to maximize your rental business.</p>
                </header>

                {/* Notifications */}
                {successMessage && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '12px 16px', borderRadius: 8, marginBottom: 24, textAlign: 'center' }}>
                        {successMessage}
                    </div>
                )}
                {errorMessage && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px 16px', borderRadius: 8, marginBottom: 24, textAlign: 'center' }}>
                        {errorMessage}
                    </div>
                )}

                <div className="premium-pricing-card">
                    <div className="premium-plan-badge">
                        {quote?.isCurrentlyActive ? 'ACTIVE MEMBER' : 'PRO PASS'}
                    </div>
                    <h2>Monthly Subscription</h2>
                    <div className="premium-price">₹300<span>/mo</span></div>

                    {quote?.isCurrentlyActive && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '10px 14px', borderRadius: 8, margin: '16px 0', fontSize: '0.9rem', color: '#10b981' }}>
                            Your Premium membership is active until <strong>{new Date(quote.premiumUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                        </div>
                    )}

                    <ul className="premium-benefits">
                        <li>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Post unlimited listings
                        </li>
                        <li>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Unlock contact of seller
                        </li>
                        <li>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Priority customer support
                        </li>
                        <li>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Advanced listing analytics
                        </li>
                    </ul>

                    {/* Available Wallet Info */}
                    {quote && (
                        <div style={{
                            background: 'var(--bg-subtle, rgba(249, 115, 22, 0.08))',
                            borderRadius: 8,
                            padding: '12px 16px',
                            margin: '20px 0',
                            border: '1px solid var(--border, rgba(0, 0, 0, 0.1))',
                            textAlign: 'left',
                            fontSize: '0.9rem'
                        }}>
                            <div style={{ color: 'var(--text-secondary, #64748b)' }}>Available Wallet Balance:</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981', marginTop: 2 }}>
                                ₹{formatRupees(quote.availableBalancePaise)}
                            </div>
                        </div>
                    )}

                    {/* Action buttons (Disabled if currently active) */}
                    {quote?.isCurrentlyActive ? (
                        <button className="btn-upgrade" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                            Premium Already Active
                        </button>
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

                <Link to="/" className="premium-back-link">← Back to Dashboard</Link>
            </div>
        </div>
    );
}
