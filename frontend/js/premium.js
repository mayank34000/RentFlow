document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn || isLoggedIn !== 'true') {
        window.location.href = 'login.html?redirect=premium.html';
        return;
    }

    const upgradeBtn = document.getElementById('upgrade-btn');

    upgradeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        const options = {
            "key": "rzp_test_TPWlCTZ9mczHSa", 
            "amount": "30000",   
            "currency": "INR",   
            "name": "RentFlow",
            "description": "Premium Pass - 1 Month Access",
            "handler": function (response) {
                console.log("Successful Payment ID:", response.razorpay_payment_id);
                
                const currentUser = JSON.parse(localStorage.getItem('current_user'));
                let allUsers = JSON.parse(localStorage.getItem('user')) || [];

                if (currentUser) {
                    const today = new Date();
                    let expiryDate = new Date();

                    if (currentUser.isPremium && currentUser.premiumExpiryDate) {
                        const currentExpiry = new Date(currentUser.premiumExpiryDate);
                        if (currentExpiry > today) {
                            // Start from the current expiry date if it hasn't passed
                            expiryDate = currentExpiry;
                        } else {
                            expiryDate = today;
                        }
                    } else {
                        expiryDate = today;
                    }

                    // Add 30 days
                    expiryDate.setDate(expiryDate.getDate() + 30);

                    // 2. Update current user object
                    currentUser.isPremium = true;
                    currentUser.premiumPurchaseDate = today.toISOString();
                    currentUser.premiumExpiryDate = expiryDate.toISOString();
                    
                    localStorage.setItem('current_user', JSON.stringify(currentUser));

                    // 3. Update the main database array
                    const userIndex = allUsers.findIndex(u => u.useremail === currentUser.useremail);
                    if (userIndex !== -1) {
                        allUsers[userIndex].isPremium = true;
                        allUsers[userIndex].premiumPurchaseDate = today.toISOString();
                        allUsers[userIndex].premiumExpiryDate = expiryDate.toISOString();
                        localStorage.setItem('user', JSON.stringify(allUsers));
                    }
                }

                alert('Payment Successful! Welcome to RentFlow Premium.');
                window.location.href = 'index.html';
            },
            "prefill": {
                "name": "Madhav Taneja", 
                "email": "madhav@example.com",
                "contact": "9999999999" 
            },
            "theme": {
                "color": "#2563eb" 
            }
        };

        try {
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function (response){
                console.error("Razorpay Error Details:", response.error);
                alert("Payment Failed: " + response.error.description);
            });
            
            rzp.open();
        } catch (error) {
            console.error("SDK Error:", error);
            alert("Failed to load payment gateway.");
        }
    });
});