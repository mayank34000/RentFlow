document.addEventListener("DOMContentLoaded", () => {
    let lastScrollTop = window.scrollY || document.documentElement.scrollTop;
    const header = document.getElementById("site-header");
    
    if (header) {
        window.addEventListener("scroll", () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            
            if (scrollTop > lastScrollTop && scrollTop > header.offsetHeight) {
                // Scrolling down
                header.classList.add("hidden-nav");
            } else {
                // Scrolling up
                header.classList.remove("hidden-nav");
            }
            
            // Add scrolled background if past top
            if (scrollTop > 50) {
                header.classList.add("scrolled");
            } else {
                header.classList.remove("scrolled");
            }
            
            lastScrollTop = scrollTop;
        });
    }

    // Inject Dropdown CSS Overrides
    const style = document.createElement("style");
    style.id = "dropdown-menu-global-styles";
    style.textContent = `
        .profile-dropdown-menu a:hover {
            background: rgba(255, 255, 255, 0.06) !important;
            color: #fff !important;
        }
        body.light-theme .profile-dropdown-menu {
            background: #ffffff !important;
            border-color: rgba(0, 0, 0, 0.08) !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
        }
        body.light-theme .profile-dropdown-menu a {
            color: #4b5563 !important;
        }
        body.light-theme .profile-dropdown-menu a:hover {
            background: rgba(0, 0, 0, 0.04) !important;
            color: #111827 !important;
        }
        body.light-theme .profile-dropdown-trigger span {
            color: #111827 !important;
        }
        body.light-theme .profile-dropdown-trigger svg {
            color: #111827 !important;
        }
    `;
    document.head.appendChild(style);
});

// ========================================
// GLOBAL WALLET MANAGEMENT SYSTEM
// ========================================
window.getWalletBalance = function(email) {
    let users = [];
    try {
        users = JSON.parse(localStorage.getItem('user')) || [];
    } catch(e) {}
    const user = users.find(u => u.useremail === email);
    return user && user.walletBalance !== undefined ? user.walletBalance : 0;
};

window.updateWalletBalance = function(email, amount) {
    let users = [];
    try {
        users = JSON.parse(localStorage.getItem('user')) || [];
    } catch(e) {}
    const userIndex = users.findIndex(u => u.useremail === email);
    if (userIndex !== -1) {
        const currentBalance = users[userIndex].walletBalance !== undefined ? users[userIndex].walletBalance : 0;
        users[userIndex].walletBalance = currentBalance + amount;
        localStorage.setItem('user', JSON.stringify(users));
        
        // Also update currently logged-in user if it matches
        const currentUser = JSON.parse(localStorage.getItem('current_user'));
        if (currentUser && currentUser.useremail === email) {
            currentUser.walletBalance = users[userIndex].walletBalance;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
        }
        return users[userIndex].walletBalance;
    }
    return 0;
};

window.openWalletModal = function() {
    let existing = document.getElementById("wallet-modal");
    if (existing) existing.remove();

    const currentUser = JSON.parse(localStorage.getItem('current_user')) || { useremail: 'guest@example.com', username: 'Guest' };
    const email = currentUser.useremail;
    const balance = getWalletBalance(email);

    // Get transactions from LocalStorage
    let transactions = [];
    try {
        transactions = JSON.parse(localStorage.getItem(`wallet_tx_${email}`)) || [];
    } catch(e) {}
    localStorage.setItem(`wallet_tx_${email}`, JSON.stringify(transactions));

    const isLight = document.body.classList.contains('light-theme');

    const modalHtml = `
        <div class="modal-backdrop show" id="wallet-modal" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 9999;">
            <div class="modal-card" style="max-width: 420px; width: 90%; background: ${isLight ? '#ffffff' : '#12172b'}; border: 1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}; padding: 32px; border-radius: 20px; position: relative; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);">
                <button class="modal-close" onclick="document.getElementById('wallet-modal').remove()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; color: #8b93a1; cursor: pointer;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <h3 class="modal-title" style="text-align: center; margin-bottom: 24px; font-family: 'Manrope', sans-serif; font-size: 22px; color: ${isLight ? '#111827' : '#ffffff'};">My Wallet</h3>
                
                <div style="background: ${isLight ? '#f3f4f6' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'}; padding: 24px; border-radius: 14px; text-align: center; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 13px; color: #8b93a1; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Available Balance</p>
                    <h2 id="wallet-balance-val" style="margin: 8px 0 0; font-size: 36px; font-weight: 800; font-family: 'Manrope', sans-serif; color: #3a5bd9;">₹${balance.toLocaleString('en-IN')}</h2>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: ${isLight ? '#111827' : '#ffffff'};">Manage Wallet Funds</h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <input type="number" id="add-wallet-amount" placeholder="Enter amount (₹)..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid ${isLight ? '#ddd' : 'rgba(255,255,255,0.1)'}; background: ${isLight ? '#ffffff' : 'rgba(0,0,0,0.2)'}; color: ${isLight ? '#333' : '#fff'}; outline: none;" />
                        
                        <div id="withdrawal-methods-container" style="display: none; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid ${isLight ? '#ddd' : 'rgba(255,255,255,0.08)'}; border-radius: 8px; background: ${isLight ? '#f9fafb' : 'rgba(0,0,0,0.15)'};">
                            <label style="font-size: 11px; font-weight: 700; color: #8b93a1; text-transform: uppercase;">Withdrawal Payout Method</label>
                            <select id="withdrawal-payout-type" onchange="toggleWithdrawMethodFields()" style="padding: 8px; border-radius: 6px; border: 1px solid ${isLight ? '#ddd' : 'rgba(255,255,255,0.1)'}; background: ${isLight ? '#fff' : '#12172b'}; color: ${isLight ? '#333' : '#fff'}; outline: none;">
                                <option value="UPI">UPI Transfer</option>
                                <option value="Bank">Bank Account Payout</option>
                            </select>
                            
                            <div id="payout-upi-fields">
                                <input type="text" id="payout-upi-id" placeholder="Enter UPI ID (e.g. name@upi)" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid ${isLight ? '#ddd' : 'rgba(255,255,255,0.1)'}; background: ${isLight ? '#fff' : 'rgba(0,0,0,0.2)'}; color: ${isLight ? '#333' : '#fff'}; outline: none; font-size: 13px;" />
                            </div>
                            
                            <div id="payout-bank-fields" style="display: none; flex-direction: column; gap: 6px;">
                                <input type="text" id="payout-bank-ac" placeholder="Bank Account Number" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid ${isLight ? '#ddd' : 'rgba(255,255,255,0.1)'}; background: ${isLight ? '#fff' : 'rgba(0,0,0,0.2)'}; color: ${isLight ? '#333' : '#fff'}; outline: none; font-size: 13px;" />
                                <input type="text" id="payout-bank-ifsc" placeholder="Bank IFSC Code" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid ${isLight ? '#ddd' : 'rgba(255,255,255,0.1)'}; background: ${isLight ? '#fff' : 'rgba(0,0,0,0.2)'}; color: ${isLight ? '#333' : '#fff'}; outline: none; font-size: 13px;" />
                            </div>
                        </div>

                        <div style="display: flex; gap: 8px;">
                            <button id="btn-wallet-credit" onclick="handleWalletActionClick('Credit')" style="flex: 1; background: #10b981; color: white; border: none; border-radius: 8px; padding: 10px; font-weight: 700; cursor: pointer; transition: background 0.2s;">Add (Credit)</button>
                            <button id="btn-wallet-debit" onclick="handleWalletActionClick('Debit')" style="flex: 1; background: #ef4444; color: white; border: none; border-radius: 8px; padding: 10px; font-weight: 700; cursor: pointer; transition: background 0.2s;">Withdraw (Debit)</button>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: ${isLight ? '#111827' : '#ffffff'};">Recent Transactions</h4>
                    <div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
                        ${transactions.length === 0 ? '<p style="color:#8b93a1; font-size:12px;">No transactions yet.</p>' : 
                          transactions.map(t => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom: 1px solid ${isLight ? '#f3f4f6' : 'rgba(255,255,255,0.05)'};">
                                <div>
                                    <p style="margin:0; font-size:13px; font-weight:600; color: ${isLight ? '#111827' : '#ffffff'};">${t.desc}</p>
                                    <span style="font-size:11px; color:#8b93a1;">${t.date}</span>
                                </div>
                                <span style="font-size:13px; font-weight:700; color: ${t.type === 'Credit' ? '#10b981' : '#ef4444'};">${t.type === 'Credit' ? '+' : '-'} ₹${t.amount}</span>
                            </div>
                          `).reverse().join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Close modal on clicking backdrop
    const backdrop = document.getElementById("wallet-modal");
    backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.remove();
    });
};

window.toggleWithdrawMethodFields = function() {
    const type = document.getElementById("withdrawal-payout-type").value;
    const upiFields = document.getElementById("payout-upi-fields");
    const bankFields = document.getElementById("payout-bank-fields");
    if (type === 'UPI') {
        if (upiFields) upiFields.style.display = "block";
        if (bankFields) bankFields.style.display = "none";
    } else {
        if (upiFields) upiFields.style.display = "none";
        if (bankFields) bankFields.style.display = "flex";
    }
};

window.cancelWithdrawal = function() {
    const container = document.getElementById("withdrawal-methods-container");
    if (container) container.style.display = "none";
    
    const debitBtn = document.getElementById("btn-wallet-debit");
    const creditBtn = document.getElementById("btn-wallet-credit");
    if (debitBtn) debitBtn.textContent = "Withdraw (Debit)";
    if (creditBtn) {
        creditBtn.textContent = "Add (Credit)";
        creditBtn.setAttribute("onclick", "handleWalletActionClick('Credit')");
    }
};

window.handleWalletActionClick = function(actionType) {
    const input = document.getElementById("add-wallet-amount");
    const amount = parseFloat(input.value);
    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    const container = document.getElementById("withdrawal-methods-container");
    if (actionType === 'Debit') {
        if (container.style.display === "none") {
            container.style.display = "flex";
            document.getElementById("btn-wallet-debit").textContent = "Confirm Withdraw";
            document.getElementById("btn-wallet-credit").textContent = "Cancel";
            document.getElementById("btn-wallet-credit").setAttribute("onclick", "cancelWithdrawal()");
            return;
        }

        // Validate withdrawal details
        const payoutType = document.getElementById("withdrawal-payout-type").value;
        let desc = "";
        if (payoutType === 'UPI') {
            const upiId = document.getElementById("payout-upi-id").value.trim();
            if (!upiId) {
                alert("Please enter your UPI ID.");
                return;
            }
            desc = `Withdrawal to UPI (${upiId})`;
        } else {
            const acNum = document.getElementById("payout-bank-ac").value.trim();
            const ifsc = document.getElementById("payout-bank-ifsc").value.trim();
            if (!acNum || !ifsc) {
                alert("Please enter Account Number and IFSC Code.");
                return;
            }
            desc = `Withdrawal to Bank (A/C: ******${acNum.slice(-4)})`;
        }

        const currentUser = JSON.parse(localStorage.getItem('current_user')) || { useremail: 'guest@example.com' };
        const email = currentUser.useremail;
        const currentBalance = getWalletBalance(email);
        
        if (amount > currentBalance) {
            alert("Insufficient funds in wallet.");
            return;
        }

        // Deduct balance
        const newBal = updateWalletBalance(email, -amount);
        
        // Add transaction record
        let transactions = [];
        try {
            transactions = JSON.parse(localStorage.getItem(`wallet_tx_${email}`)) || [];
        } catch(e) {}
        transactions.push({
            type: 'Debit',
            amount: amount,
            desc: desc,
            date: new Date().toLocaleDateString('en-IN')
        });
        localStorage.setItem(`wallet_tx_${email}`, JSON.stringify(transactions));
        
        alert(`Withdrawal Success!\n₹${amount} transferred via ${payoutType}.`);
        openWalletModal();
    } else {
        const currentUser = JSON.parse(localStorage.getItem('current_user')) || { useremail: 'guest@example.com' };
        handleAddWalletFunds(currentUser.useremail, amount);
    }
};

window.handleAddWalletFunds = function(email, amount) {
    const initiateTopup = () => {
        const options = {
            "key": "rzp_test_TPWlCTZ9mczHSa", 
            "amount": amount * 100, // in paise
            "currency": "INR",   
            "name": "RentFlow Wallet Top-up",
            "description": `Add ₹${amount} to wallet`,
            "handler": function (response) {
                console.log("Wallet Top-up Payment ID:", response.razorpay_payment_id);
                
                // Update wallet balance
                const newBal = updateWalletBalance(email, amount);
                
                // Add transaction record
                let transactions = [];
                try {
                    transactions = JSON.parse(localStorage.getItem(`wallet_tx_${email}`)) || [];
                } catch(e) {}
                transactions.push({
                    type: 'Credit',
                    amount: amount,
                    desc: 'Top-up via Razorpay',
                    date: new Date().toLocaleDateString('en-IN')
                });
                localStorage.setItem(`wallet_tx_${email}`, JSON.stringify(transactions));
                
                // Update UI inside modal
                document.getElementById("wallet-balance-val").textContent = "₹" + newBal.toLocaleString('en-IN');
                const input = document.getElementById("add-wallet-amount");
                if (input) input.value = "";
                alert(`Payment Successful! Successfully added ₹${amount} to your wallet.`);
                
                // Re-render modal
                openWalletModal();
            },
            "prefill": {
                "name": JSON.parse(localStorage.getItem('current_user'))?.username || "User",
                "email": email
            },
            "theme": {
                "color": "#3a5bd9"
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
    };

    // Load Razorpay dynamically if not loaded
    if (typeof Razorpay === "undefined") {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = initiateTopup;
        script.onerror = () => alert("Failed to load Razorpay payment gateway.");
        document.head.appendChild(script);
    } else {
        initiateTopup();
    }
};
