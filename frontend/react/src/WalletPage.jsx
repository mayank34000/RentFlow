import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import { apiRequest, getAuthUser, isLoggedIn } from './services/api';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './useNavbarBehavior';

export default function WalletPage() {
    useTheme();
    const navigate = useNavigate();
    const user = getAuthUser();

    // ── State variables ───────────────────────────────────────────────────────
    const [wallet, setWallet] = useState({ balancePaise: 0, lockedPaise: 0, currency: 'INR' });
    const [ledger, setLedger] = useState([]);
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'pending'
    const [pagination, setPagination] = useState({ page: 1, limit: 20, totalCount: 0, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Top-up form state
    const [topupRupees, setTopupRupees] = useState('500');
    const [topupLoading, setTopupLoading] = useState(false);
    const [topupError, setTopupError] = useState('');

    // Pending payment check state
    const [pendingChecking, setPendingChecking] = useState(false);

    // ── Approved Hook: Load wallet and ledger on mount ─────────────────────────
    useEffect(() => {
        if (!isLoggedIn()) {
            navigate('/login');
            return;
        }
        fetchWalletData(1);
    }, [navigate]);

    // ── Data Fetching ─────────────────────────────────────────────────────────
    const fetchWalletData = async (page = 1) => {
        setIsLoading(true);
        setError('');
        try {
            const { data } = await apiRequest(`/api/wallet?page=${page}&limit=20`);
            if (data?.success && data?.data) {
                setWallet(data.data.wallet || { balancePaise: 0, lockedPaise: 0, currency: 'INR' });
                setLedger(data.data.ledger || []);
                if (data.data.pagination) {
                    setPagination(data.data.pagination);
                }
            } else {
                setError(data?.message || 'Failed to load wallet data.');
            }
        } catch (err) {
            setError(err.message || 'Error connecting to wallet service.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const formatPaise = (paise) => {
        if (typeof paise !== 'number') return '₹0.00';
        const val = paise / 100;
        return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        const d = new Date(isoString);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeBadge = (type) => {
        const badges = {
            TOPUP: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Top-Up' },
            RENTAL_HOLD: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Rental Hold' },
            DEPOSIT_HOLD: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Deposit Hold' },
            RENTAL_RELEASE: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: 'Rental Refund' },
            DEPOSIT_RELEASE: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Deposit Refund' },
            RENTAL_SETTLE: { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', label: 'Rent Settled' },
            RENTAL_EARNING: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Rental Payout' },
            DEPOSIT_DEDUCTION: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Damage Deduction' },
            DAMAGE_COMPENSATION: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', label: 'Damage Payout' },
            COMMISSION_FEE: { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', label: 'Platform Fee' },
            PREMIUM_PAYMENT: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: 'Pro Pass' }
        };
        const config = badges[type] || { bg: 'rgba(100, 116, 139, 0.15)', color: 'var(--text-secondary, #64748b)', label: type };
        return (
            <span style={{
                background: config.bg,
                color: config.color,
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.02em'
            }}>
                {config.label}
            </span>
        );
    };

    const displayedLedger = filterMode === 'pending'
        ? ledger.filter(row => (row.lockedDeltaPaise > 0) || row.type === 'DEPOSIT_HOLD' || row.type === 'RENTAL_HOLD')
        : ledger;

    // ── Top-Up Handlers ───────────────────────────────────────────────────────
    const handleTopupSubmit = async (e) => {
        e.preventDefault();
        setTopupError('');
        setSuccessMessage('');

        // Strict client-side validation
        const trimmed = topupRupees.trim();
        if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
            setTopupError('Please enter a valid rupee amount (e.g. 500 or 500.50).');
            return;
        }

        const numVal = parseFloat(trimmed);
        if (numVal < 100) {
            setTopupError('Minimum top-up amount is ₹100.');
            return;
        }
        if (numVal > 50000) {
            setTopupError('Maximum top-up amount is ₹50,000 per transaction.');
            return;
        }

        const currentTotal = (wallet.balancePaise + wallet.lockedPaise) / 100;
        if (currentTotal + numVal > 100000) {
            setTopupError('Wallet balance cap is ₹1,00,000.');
            return;
        }

        setTopupLoading(true);

        try {
            // 1. Create order on backend
            const { data: orderRes } = await apiRequest('/api/wallet/topup/order', {
                method: 'POST',
                body: { amountRupees: numVal }
            });

            if (!orderRes?.success || !orderRes?.data) {
                setTopupError(orderRes?.message || 'Failed to initialize payment.');
                setTopupLoading(false);
                return;
            }

            const { orderId, amount, currency, keyId } = orderRes.data;

            if (!window.Razorpay) {
                setTopupError('Razorpay SDK failed to load. Please refresh the page.');
                setTopupLoading(false);
                return;
            }

            // 2. Open Razorpay Checkout modal
            const options = {
                key: keyId,
                amount,
                currency,
                order_id: orderId,
                name: 'RentFlow Wallet',
                description: `Wallet Top-Up (₹${trimmed})`,
                handler: async function (response) {
                    try {
                        // 3. Authoritative server verification
                        const { data: verifyRes } = await apiRequest('/api/wallet/topup/verify', {
                            method: 'POST',
                            body: {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            }
                        });

                        if (verifyRes?.success) {
                            setSuccessMessage(`Top-up successful! Added ₹${trimmed} to your wallet.`);
                            setTopupRupees('500');
                            fetchWalletData(1);
                        } else {
                            setTopupError(verifyRes?.message || 'Payment verification failed.');
                        }
                    } catch (verifyErr) {
                        setTopupError(verifyErr.message || 'Payment verification error.');
                    } finally {
                        setTopupLoading(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setTopupLoading(false);
                    }
                },
                prefill: {
                    name: user?.name || '',
                    email: user?.email || ''
                },
                theme: {
                    color: '#f97316'
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
                setTopupError(resp.error?.description || 'Payment failed.');
                setTopupLoading(false);
            });
            rzp.open();
        } catch (err) {
            setTopupError(err.message || 'Error creating payment order.');
            setTopupLoading(false);
        }
    };

    // ── Check Pending Orders ──────────────────────────────────────────────────
    const handleCheckPending = async () => {
        setPendingChecking(true);
        setFilterMode('pending');
        setError('');
        try {
            const { data } = await apiRequest('/api/wallet/topup/check-pending', {
                method: 'POST'
            });
            if (data?.success) {
                setSuccessMessage(data.message);
                fetchWalletData(1);
            } else {
                setError(data?.message || 'Failed to check pending orders.');
            }
        } catch (err) {
            setError(err.message || 'Error checking pending payments.');
        } finally {
            setPendingChecking(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>
            <Navbar />

            <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '100px 20px 60px' }}>
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', background: 'rgba(249, 115, 22, 0.15)', color: 'var(--primary-orange, #f97316)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>
                        RentFlow Secure Wallet
                    </div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-strongest, var(--text-primary, #0f172a))' }}>
                        My Wallet &amp; Security Deposits
                    </h1>
                    <p style={{ color: 'var(--text-secondary, #64748b)', margin: 0 }}>
                        Manage your available funds for seamless instant rentals and track refundable security deposits.
                    </p>
                </div>

                {/* Notifications */}
                {successMessage && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '12px 16px', borderRadius: 8, marginBottom: 24 }}>
                        {successMessage}
                    </div>
                )}
                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px 16px', borderRadius: 8, marginBottom: 24 }}>
                        {error}
                    </div>
                )}

                {/* Balance Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
                    {/* Available Balance */}
                    <div style={{ background: 'var(--bg-card, #1e293b)', borderRadius: 12, padding: '24px', border: '1px solid var(--border, #334155)' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)', marginBottom: 8, fontWeight: 500 }}>Available Balance</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
                            {isLoading ? '...' : formatPaise(wallet.balancePaise)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginTop: 8 }}>
                            Ready to use for booking items directly.
                        </div>
                    </div>

                    {/* Security Deposit On Hold */}
                    <div style={{ background: 'var(--bg-card, #1e293b)', borderRadius: 12, padding: '24px', border: '1px solid var(--border, #334155)' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)', marginBottom: 8, fontWeight: 500 }}>Security Deposit On Hold</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.02em' }}>
                            {isLoading ? '...' : formatPaise(wallet.lockedPaise)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginTop: 8 }}>
                            Held securely as refundable deposit for active rentals.
                        </div>
                    </div>

                    {/* Total Net Worth */}
                    <div style={{ background: 'var(--bg-card, #1e293b)', borderRadius: 12, padding: '24px', border: '1px solid var(--border, #334155)' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)', marginBottom: 8, fontWeight: 500 }}>Total Funds</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-strongest, var(--text-primary, #0f172a))', letterSpacing: '-0.02em' }}>
                            {isLoading ? '...' : formatPaise(wallet.balancePaise + wallet.lockedPaise)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginTop: 8 }}>
                            Max wallet limit: ₹1,00,000.00
                        </div>
                    </div>
                </div>

                {/* Top-Up Section */}
                <div style={{ background: 'var(--bg-card, #1e293b)', borderRadius: 12, padding: '28px', border: '1px solid var(--border, #334155)', marginBottom: 32 }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-strongest, var(--text-primary, #0f172a))' }}>
                        Add Funds via Razorpay
                    </h2>
                    
                    {topupError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
                            {topupError}
                        </div>
                    )}

                    <form onSubmit={handleTopupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)', marginBottom: 8, fontWeight: 500 }}>
                                Amount in Rupees (₹)
                            </label>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    value={topupRupees}
                                    onChange={(e) => setTopupRupees(e.target.value)}
                                    placeholder="e.g. 500"
                                    disabled={topupLoading}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: 8,
                                        border: '1px solid var(--border, #cbd5e1)',
                                        background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                                        color: 'var(--text-primary, #0f172a)',
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        width: '200px'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {['200', '500', '1000', '2000'].map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setTopupRupees(amt)}
                                            disabled={topupLoading}
                                            style={{
                                                padding: '8px 14px',
                                                borderRadius: 6,
                                                border: '1px solid ' + (topupRupees === amt ? 'var(--primary-orange, #f97316)' : 'var(--border, #cbd5e1)'),
                                                background: topupRupees === amt ? 'rgba(249, 115, 22, 0.15)' : 'var(--bg-subtle, rgba(0, 0, 0, 0.03))',
                                                borderColor: topupRupees === amt ? 'var(--primary-orange, #f97316)' : 'var(--border, #cbd5e1)',
                                                color: topupRupees === amt ? 'var(--primary-orange, #f97316)' : 'var(--text-secondary, #64748b)',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            +₹{amt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', display: 'block', marginTop: 6 }}>
                                Min: ₹100 • Max: ₹50,000 per top-up. Test mode only.
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button
                                type="submit"
                                disabled={topupLoading}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: topupLoading ? '#64748b' : 'var(--primary-orange, #f97316)',
                                    color: '#fff',
                                    fontWeight: 700,
                                    cursor: topupLoading ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                {topupLoading ? 'Opening Razorpay...' : 'Add Funds'}
                            </button>

                            <button
                                type="button"
                                onClick={handleCheckPending}
                                disabled={pendingChecking}
                                style={{
                                    padding: '12px 18px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border, #cbd5e1)',
                                    background: 'transparent',
                                    color: 'var(--text-secondary, #64748b)',
                                    fontWeight: 600,
                                    cursor: pendingChecking ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {pendingChecking ? 'Checking...' : 'Check Pending Orders'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Ledger Transaction History */}
                <div style={{ background: 'var(--bg-card, #1e293b)', borderRadius: 12, padding: '28px', border: '1px solid var(--border, #334155)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--text-strongest, var(--text-primary, #0f172a))' }}>
                                Transaction History
                            </h2>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                    type="button"
                                    onClick={() => setFilterMode('all')}
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: 6,
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        border: '1px solid ' + (filterMode === 'all' ? 'var(--primary-orange, #f97316)' : 'var(--border, #cbd5e1)'),
                                        background: filterMode === 'all' ? 'var(--primary-orange, #f97316)' : 'transparent',
                                        color: filterMode === 'all' ? '#ffffff' : 'var(--text-secondary, #64748b)'
                                    }}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterMode('pending')}
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: 6,
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        border: '1px solid ' + (filterMode === 'pending' ? '#f59e0b' : 'var(--border, #cbd5e1)'),
                                        background: filterMode === 'pending' ? '#f59e0b' : 'transparent',
                                        color: filterMode === 'pending' ? '#ffffff' : '#f59e0b'
                                    }}
                                >
                                    🟡 Pending Holds Only
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => fetchWalletData(pagination.page)}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border, #cbd5e1)',
                                color: 'var(--text-secondary, #64748b)',
                                padding: '6px 12px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            Refresh
                        </button>
                    </div>

                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary, #94a3b8)' }}>
                            Loading ledger transactions...
                        </div>
                    ) : displayedLedger.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary, #64748b)' }}>
                            {filterMode === 'pending'
                                ? 'No pending holds or deposit hold orders right now.'
                                : 'No wallet transactions yet. Top up your wallet to get started.'}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border, #334155)', color: 'var(--text-secondary, #94a3b8)' }}>
                                            <th style={{ padding: '12px 8px' }}>Date</th>
                                            <th style={{ padding: '12px 8px' }}>Type</th>
                                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Available Change</th>
                                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Deposit Hold Change</th>
                                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Balance After</th>
                                            <th style={{ padding: '12px 8px' }}>Note</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedLedger.map((row) => {
                                            const balDelta = row.balanceDeltaPaise || 0;
                                            const lckDelta = row.lockedDeltaPaise || 0;
                                            return (
                                                <tr key={row._id} style={{ borderBottom: '1px solid var(--border, rgba(51, 65, 85, 0.4))' }}>
                                                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary, #94a3b8)', whiteSpace: 'nowrap' }}>
                                                        {formatDate(row.createdAt)}
                                                    </td>
                                                    <td style={{ padding: '12px 8px' }}>
                                                        {getTypeBadge(row.type)}
                                                    </td>
                                                    <td style={{
                                                        padding: '12px 8px',
                                                        textAlign: 'right',
                                                        fontWeight: 600,
                                                        color: balDelta > 0 ? '#10b981' : balDelta < 0 ? '#ef4444' : 'var(--text-secondary, #64748b)'
                                                    }}>
                                                        {balDelta > 0 ? `+${formatPaise(balDelta)}` : balDelta < 0 ? `-${formatPaise(Math.abs(balDelta))}` : '₹0.00'}
                                                    </td>
                                                    <td style={{
                                                        padding: '12px 8px',
                                                        textAlign: 'right',
                                                        fontWeight: 600,
                                                        color: lckDelta > 0 ? '#f59e0b' : lckDelta < 0 ? '#3b82f6' : 'var(--text-secondary, #64748b)'
                                                    }}>
                                                        {lckDelta > 0 ? `+${formatPaise(lckDelta)}` : lckDelta < 0 ? `-${formatPaise(Math.abs(lckDelta))}` : '₹0.00'}
                                                    </td>
                                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--text-strongest, var(--text-primary, #0f172a))' }}>
                                                        {formatPaise(row.balanceAfterPaise)}
                                                    </td>
                                                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
                                                        {row.note || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                            {/* Pagination controls */}
                            {pagination.totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                                    <button
                                        type="button"
                                        disabled={pagination.page <= 1}
                                        onClick={() => fetchWalletData(pagination.page - 1)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 6,
                                            border: '1px solid var(--border, #334155)',
                                            background: 'var(--bg-subtle, #1e293b)',
                                            color: 'var(--text-secondary, #94a3b8)',
                                            cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Previous
                                    </button>
                                    <span style={{ padding: '6px 12px', color: 'var(--text-secondary, #94a3b8)' }}>
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={pagination.page >= pagination.totalPages}
                                        onClick={() => fetchWalletData(pagination.page + 1)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 6,
                                            border: '1px solid var(--border, #334155)',
                                            background: 'var(--bg-subtle, #1e293b)',
                                            color: 'var(--text-secondary, #94a3b8)',
                                            cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
