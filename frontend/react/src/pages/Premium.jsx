import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthUser } from '../services/api';
import './styles/premium.css';

export default function Premium() {
    const navigate = useNavigate();

    useEffect(() => {
        const user = getAuthUser();
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
    }, [navigate]);

    const handleUpgrade = () => {
        if (typeof window.Razorpay === 'undefined') {
            alert('Payment gateway is loading. Please try again in a moment.');
            return;
        }

        const options = {
            key: "rzp_test_TPWlCTZ9mczHSa",
            amount: "30000",
            currency: "INR",
            name: "RentFlow",
            description: "Premium Pass - 1 Month Access",
            handler: function (response) {
                console.log("Successful Payment ID:", response.razorpay_payment_id);
                
                let currentUser = JSON.parse(localStorage.getItem('current_user'));
                let allUsers = JSON.parse(localStorage.getItem('user')) || [];

                if (currentUser) {
                    const today = new Date();
                    let expiryDate = new Date();

                    if (currentUser.isPremium && currentUser.premiumExpiryDate) {
                        const currentExpiry = new Date(currentUser.premiumExpiryDate);
                        if (currentExpiry > today) {
                            expiryDate = currentExpiry;
                        } else {
                            expiryDate = today;
                        }
                    } else {
                        expiryDate = today;
                    }

                    expiryDate.setDate(expiryDate.getDate() + 30);

                    currentUser.isPremium = true;
                    currentUser.premiumPurchaseDate = today.toISOString();
                    currentUser.premiumExpiryDate = expiryDate.toISOString();
                    
                    localStorage.setItem('current_user', JSON.stringify(currentUser));
                    
                    // The generic auth service might use token, we sync both to be safe
                    localStorage.setItem('rf_token', JSON.stringify(currentUser));

                    const userIndex = allUsers.findIndex(u => u.useremail === currentUser.useremail);
                    if (userIndex !== -1) {
                        allUsers[userIndex].isPremium = true;
                        allUsers[userIndex].premiumPurchaseDate = today.toISOString();
                        allUsers[userIndex].premiumExpiryDate = expiryDate.toISOString();
                        localStorage.setItem('user', JSON.stringify(allUsers));
                    }
                }

                alert('Payment Successful! Welcome to RentFlow Premium.');
                navigate('/');
            },
            prefill: {
                name: "RentFlow User",
                email: "user@example.com",
            },
            theme: {
                color: "#2563eb"
            }
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response){
                console.error("Razorpay Error Details:", response.error);
                alert("Payment Failed: " + response.error.description);
            });
            rzp.open();
        } catch (error) {
            console.error("SDK Error:", error);
            alert("Failed to load payment gateway.");
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
                        Upgrade to Premium
                    </button>
                </div>

                <Link to="/" className="premium-back-link">← Back to Dashboard</Link>
            </div>
        </div>
    );
}
