import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthUser, createPaymentOrder, verifyPayment } from './services/api';
import './styles/premium.css';

export default function Premium() {
    const navigate = useNavigate();
    const user = getAuthUser();

    useEffect(() => {
        if (!user) {
            navigate('/login?redirect=/premium');
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [navigate, user]);

    const handleUpgrade = async () => {
        if (typeof window.Razorpay === 'undefined') {
            alert('Payment gateway is loading. Please try again in a moment.');
            return;
        }

        try {
            // 1. Create backend order
            const orderRes = await createPaymentOrder();
            if (!orderRes || !orderRes.orderId) {
                alert('Failed to initialize payment order.');
                return;
            }

            // 2. Configure Razorpay using authoritative backend details
            const options = {
                key: orderRes.keyId,
                amount: orderRes.amount,
                currency: orderRes.currency,
                order_id: orderRes.orderId,
                name: "RentFlow",
                description: "Premium Pass - 1 Month Access",
                handler: async function (response) {
                    try {
                        // 3. Verify payment on backend
                        const verifyRes = await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        
                        if (verifyRes && verifyRes.user) {
                            // Update local storage with the new authoritative user state
                            localStorage.setItem('user', JSON.stringify(verifyRes.user));
                            alert('Payment Successful! Welcome to RentFlow Premium.');
                            window.dispatchEvent(new Event('storage')); // Trigger navbar update if it listens, or navigate will refresh
                            navigate('/');
                        }
                    } catch (verifyError) {
                        console.error("Verification Error:", verifyError);
                        alert("Payment verification failed. Please contact support.");
                    }
                },
                prefill: {
                    name: user?.name || "RentFlow User",
                    email: user?.email || "user@example.com",
                },
                theme: {
                    color: "#f59e0b" // Match our primary orange theme
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response){
                console.error("Razorpay Error Details:", response.error);
                alert("Payment Failed: " + response.error.description);
            });
            rzp.open();
        } catch (error) {
            console.error("Payment initiation error:", error);
            alert("Failed to start payment process.");
        }
    };

    return (
        <div className="premium-page-wrapper">
            <div className="premium-container">
                <header className="premium-header">
                    <h1>RentFlow <span>Premium</span></h1>
                    <p>Unlock priority support, advanced analytics, and zero-fee listings to maximize your rental business.</p>
                </header>

                <div className="premium-pricing-card">
                    <div className="premium-plan-badge">PRO PASS</div>
                    <h2>Monthly Subscription</h2>
                    <div className="premium-price">₹300<span>/mo</span></div>
                    
                    <ul className="premium-benefits">
                        <li>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Post unlimited listings
                        </li>
                        <li>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            0% Commission on rentals
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

                    <button className="btn-upgrade" onClick={handleUpgrade}>
                        {user && user.isPro ? 'Extend Premium' : 'Upgrade to Premium'}
                    </button>
                </div>

                <Link to="/" className="premium-back-link">← Back to Dashboard</Link>
            </div>
        </div>
    );
}
