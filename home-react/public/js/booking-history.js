/**
 * ============================================================================
 * RENTFLOW - BOOKING HISTORY MODULE
 * ============================================================================
 * This script handles the My Rentals page.
 * It demonstrates advanced Array operations (map, filter, reduce),
 * DOM Manipulation, and Local Storage integration.
 */

document.addEventListener("DOMContentLoaded", () => {
    // ========================================
    // 0. AUTH UI UPDATE
    // ========================================
    function updateAuthUI() {
        const authContainer = document.getElementById("auth-buttons");
        if (!authContainer) return;
        
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        if (isLoggedIn) {
            let user = { userfname: "User" };
            try { user = JSON.parse(localStorage.getItem("current_user")) || user; } catch(e) {}
            const nameToDisplay = user.name || user.username || user.userfname || 'User';
            const firstName = nameToDisplay.split(' ')[0];
            const savedImage = localStorage.getItem('profileImage') || '../assets/profile.png';
            
            authContainer.style.display = 'flex';
            authContainer.style.alignItems = 'center';
            authContainer.style.gap = '15px';
            authContainer.style.position = 'relative';
            const premiumText = user.isPremium ? "Extend Premium" : "Get Premium";
            
            authContainer.innerHTML = `
                <div class="profile-dropdown-trigger" id="profile-dropdown-trigger" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                    <div style="width: 32px; height: 32px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.2);">
                        <img src="${savedImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <span id="profile-name" style="font-weight: 600; color: #fff;">${firstName}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 2px;"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                
                <div class="profile-dropdown-menu" id="profile-dropdown-menu" style="display: none; position: absolute; top: 40px; right: 0; background: #12172b; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; width: 180px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 1000; padding: 6px 0; flex-direction: column;">
                    <a href="profile.html" style="padding: 10px 16px; color: #b0b8c6; text-decoration: none; font-size: 14px; font-weight: 500; transition: background 0.2s, color 0.2s; display: block;">My Profile</a>
                    <a href="#" id="nav-my-wallet" style="padding: 10px 16px; color: #b0b8c6; text-decoration: none; font-size: 14px; font-weight: 500; transition: background 0.2s, color 0.2s; display: block;">My Wallet</a>
                    <a href="premium.html" style="padding: 10px 16px; color: #eab308; text-decoration: none; font-size: 14px; font-weight: 600; transition: background 0.2s, color 0.2s; display: block; white-space: nowrap;">👑 ${premiumText}</a>
                    <div style="height: 1px; background: rgba(255,255,255,0.08); margin: 6px 0;"></div>
                    <a href="#" id="dropdown-logout" style="padding: 10px 16px; color: #ef4444; text-decoration: none; font-size: 14px; font-weight: 600; transition: background 0.2s; display: block;">Logout</a>
                </div>
            `;
            
            const trigger = document.getElementById("profile-dropdown-trigger");
            const menu = document.getElementById("profile-dropdown-menu");
            
            trigger.addEventListener("click", (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === "flex" ? "none" : "flex";
            });
            
            document.addEventListener("click", () => {
                menu.style.display = "none";
            });
            
            document.getElementById("nav-my-wallet").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                menu.style.display = "none";
                openWalletModal();
            });
            
            document.getElementById("dropdown-logout").addEventListener("click", (e) => {
                e.preventDefault();
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("current_user");
                window.location.reload();
            });
        }
    }
    updateAuthUI();

    // ========================================
    // 1. STATE MANAGEMENT
    // ========================================
    let allBookings = [];
    let currentFilter = "All"; // All, Pending, Active, Completed, Cancelled
    
    // DOM Elements
    const ordersList = document.getElementById("orders-list");
    const filterTabs = document.getElementById("filter-tabs");
    
    // Stats Elements
    const statTotal = document.getElementById("stat-total");
    const statActive = document.getElementById("stat-active");
    const statCompleted = document.getElementById("stat-completed");
    const statReturned = document.getElementById("stat-returned");
    const statSpent = document.getElementById("stat-spent");

    // Modal Elements
    const receiptModal = document.getElementById("receipt-modal");

    // ========================================
    // 2. INITIALIZATION
    // ========================================
    init();

    function init() {
        fetchBookings();
        calculateStats();
        renderOrders();
        setupEventListeners();
    }

    // ========================================
    // 3. DATA FETCHING (Local Storage)
    // ========================================
    /**
     * Fetches bookings from localStorage.
     * If empty, injects seed data as requested by user.
     */
    function fetchBookings() {
        const stored = localStorage.getItem('rentflow_bookings');
        if (stored) {
            try {
                allBookings = JSON.parse(stored);
            } catch (e) {
                console.error("Error parsing bookings", e);
                allBookings = getSeedBookings();
            }
        } else {
            allBookings = getSeedBookings();
            localStorage.setItem('rentflow_bookings', JSON.stringify(allBookings));
        }
    }

    function getMyBookings() {
        const currentUser = JSON.parse(localStorage.getItem('current_user'));
        const userEmail = currentUser ? currentUser.useremail : '';
        
        return allBookings.filter(booking => {
            // For legacy seed bookings that don't have renterEmail, show them only to default seed user (rahul@example.com)
            if (!booking.renterEmail) {
                return userEmail === 'rahul@example.com';
            }
            return booking.renterEmail === userEmail;
        });
    }

    // ========================================
    // 4. ARRAY REDUCE: CALCULATE STATS
    // ========================================
    /**
     * Uses Array.prototype.reduce() to calculate aggregate statistics
     * from the user's booking history.
     */
    function calculateStats() {
        const myBookings = getMyBookings();

        // Total Rentals
        statTotal.textContent = myBookings.length;

        // Using reduce to count Active bookings
        const activeCount = myBookings.reduce((count, booking) => {
            return booking.status === 'Active' ? count + 1 : count;
        }, 0);
        statActive.textContent = activeCount;

        // Using reduce to count Completed bookings
        const completedCount = myBookings.reduce((count, booking) => {
            return booking.status === 'Completed' ? count + 1 : count;
        }, 0);
        statCompleted.textContent = completedCount;

        // Using reduce to count Returned bookings
        const returnedCount = myBookings.reduce((count, booking) => {
            return booking.status === 'Returned' ? count + 1 : count;
        }, 0);
        if (statReturned) statReturned.textContent = returnedCount;

        // Using reduce to sum total spent (only for Completed/Active/Pending/Returned, ignoring Cancelled if any)
        const totalSpent = myBookings.reduce((sum, booking) => {
            if (booking.status !== 'Cancelled') {
                return sum + (booking.grandTotal || 0);
            }
            return sum;
        }, 0);
        statSpent.textContent = `₹${totalSpent.toLocaleString('en-IN')}`;
    }

    // ========================================
    // 5. ARRAY FILTER & MAP: RENDER ORDERS
    // ========================================
    /**
     * Filters the bookings based on current tab, then maps them to HTML.
     */
    function renderOrders() {
        const myBookings = getMyBookings();
        let filtered = myBookings;

        if (currentFilter !== "All") {
            filtered = myBookings.filter(b => b.status === currentFilter);
        }

        if (filtered.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    </div>
                    <h3 class="empty-title">No ${currentFilter === 'All' ? 'rentals' : currentFilter.toLowerCase() + ' rentals'} found</h3>
                    <p class="empty-sub">Looks like you haven't booked anything yet.</p>
                    <a href="booking.html" class="btn-primary">Explore Rentals</a>
                </div>
            `;
            return;
        }

        ordersList.innerHTML = filtered.map(item => {
            const statusClass = `status-${item.status.toLowerCase()}`;
            const dateStr = item.startDate ? `${formatDate(item.startDate)} - ${formatDate(item.endDate)}` : 'Dates TBD';
            
            return `
                <div class="order-card">
                    <div class="order-info-wrapper">
                        <img src="${item.itemImage}" alt="${item.itemTitle}" class="order-img" />
                        <div class="order-details">
                            <h4 class="order-title">${item.itemTitle}</h4>
                            <div class="order-meta">
                                Lender: <span>${item.lenderName}</span>
                            </div>
                            <div class="order-meta">
                                Dates: <span>${dateStr} (${item.duration} days)</span>
                            </div>
                            ${item.status === 'Active' ? `<div class="order-meta" style="color: #ef4444; font-weight: 600;" id="countdown-${item.id}">Time Left: Calculating...</div>` : ''}
                            <div class="order-status-badge ${statusClass}">${item.status}</div>
                        </div>
                    </div>
                    
                    <div class="order-actions" style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                        <div class="order-price">₹${item.grandTotal.toLocaleString('en-IN')}</div>
                        ${item.status === 'Approved' ? `<button class="btn-primary" style="padding: 6px 12px; font-size: 13px;" onclick="window.initiatePayment('${item.id}')">Pay Now</button>` : ''}
                        <button class="btn-receipt" onclick="window.openReceiptModal('${item.id}')">View Receipt</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ========================================
    // COUNTDOWN LOGIC FOR ACTIVE RENTALS
    // ========================================
    setInterval(() => {
        const myBookings = getMyBookings();
        myBookings.forEach(item => {
            if (item.status === 'Active' && item.endDate) {
                const el = document.getElementById(`countdown-${item.id}`);
                if (el) {
                    const hasTime = item.endDate.includes('T') || item.endDate.includes(':');
                    const end = new Date(item.endDate);
                    if (!hasTime) {
                        end.setHours(23, 59, 59, 999);
                    }
                    const now = new Date();
                    const diff = end - now;

                    if (diff <= 0) {
                        el.textContent = "Rental Ended";
                        el.style.color = "#ef4444";
                        
                        // Automatically complete it
                        item.status = 'Completed';
                        localStorage.setItem('rentflow_bookings', JSON.stringify(allBookings));
                        calculateStats();
                        renderOrders();
                    } else {
                        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const s = Math.floor((diff % (1000 * 60)) / 1000);
                        el.textContent = `Time Left: ${d}d ${h}h ${m}m ${s}s`;
                    }
                }
            }
        });
    }, 1000);

    // ========================================
    // RAZORPAY PAYMENT LOGIC
    // ========================================
    window.initiatePayment = function(bookingId) {
        const booking = allBookings.find(b => b.id === bookingId);
        if (!booking) return;

        const options = {
            "key": "rzp_test_TPWlCTZ9mczHSa", 
            "amount": booking.grandTotal * 100, // in paise
            "currency": "INR",   
            "name": "RentFlow",
            "description": "Payment for " + booking.itemTitle,
            "handler": function (response) {
                console.log("Successful Payment ID:", response.razorpay_payment_id);
                
                // Update status to Active
                booking.status = 'Active';
                localStorage.setItem('rentflow_bookings', JSON.stringify(allBookings));
                
                alert('Payment Successful! Rental is now Active.');
                calculateStats();
                renderOrders();
            },
            "prefill": {
                "name": "User", 
                "email": "user@example.com",
                "contact": "9999999999" 
            },
            "theme": {
                "color": "#2563eb" 
            }
        };

        try {
            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response){
                alert("Payment Failed: " + response.error.description);
            });
            rzp.open();
        } catch (error) {
            alert("Failed to load payment gateway.");
        }
    };

    // ========================================
    // 6. EVENT DELEGATION
    // ========================================
    function setupEventListeners() {
        // Tab Filtering
        filterTabs.addEventListener("click", (e) => {
            if (e.target.classList.contains("filter-tab")) {
                document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
                e.target.classList.add("active");
                
                currentFilter = e.target.getAttribute("data-filter");
                renderOrders();
            }
        });

        // Close Receipt Modal
        document.getElementById("close-receipt-modal").addEventListener("click", () => {
            receiptModal.classList.remove("show");
        });

        receiptModal.addEventListener("click", (e) => {
            if (e.target === receiptModal) {
                receiptModal.classList.remove("show");
            }
        });

        // Download Receipt (PDF)
        document.getElementById("btn-download-receipt").addEventListener("click", () => {
            const btn = document.getElementById("btn-download-receipt");
            const originalText = btn.textContent;
            btn.textContent = "Generating PDF...";
            btn.disabled = true;

            try {
                // Read live values from receipt modal
                const itemName  = document.getElementById("receipt-item").textContent;
                const lender    = document.getElementById("receipt-lender").textContent;
                const dates     = document.getElementById("receipt-dates").textContent;
                const rate      = document.getElementById("receipt-rate").textContent;
                const duration  = document.getElementById("receipt-duration").textContent;
                const subtotal  = document.getElementById("receipt-subtotal").textContent;
                const deposit   = document.getElementById("receipt-deposit").textContent;
                const total     = document.getElementById("receipt-total").textContent;
                const now       = new Date();
                const generatedOn = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                                  + ', ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                // jsPDF Helvetica doesn't support ₹ unicode — convert to "Rs."
                const toRs = (val) => val.replace(/₹/g, 'Rs. ').trim();

                // Access jsPDF — try multiple bundle exposure patterns
                const jsPDFLib = (window.jspdf && window.jspdf.jsPDF)
                    || window.jsPDF
                    || (window.jspdf);
                if (!jsPDFLib) throw new Error('jsPDF not loaded');
                const doc = new jsPDFLib({ unit: 'mm', format: 'a4', orientation: 'portrait' });

                const W = 210;   // A4 width mm
                const lm = 18;   // left margin
                const rm = W - 18; // right margin
                let y = 18;

                // ── Header bar ────────────────────────────────────────
                doc.setFillColor(26, 26, 46);
                doc.rect(0, 0, W, 28, 'F');

                // Logo: "Rent" white
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                doc.setTextColor(255, 255, 255);
                doc.text('Rent', lm, 17);

                // Logo: "Flow" blue
                doc.setTextColor(58, 91, 217);
                const rentW = doc.getTextWidth('Rent');
                doc.text('Flow', lm + rentW, 17);

                // Tagline
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(160, 170, 190);
                doc.text('Smart Dynamic Rental Platform', lm, 23);

                // Title right side
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.setTextColor(255, 255, 255);
                doc.text('Rental Receipt', rm, 15, { align: 'right' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(160, 170, 190);
                doc.text('Generated: ' + generatedOn, rm, 22, { align: 'right' });

                y = 40;

                // ── Item card ─────────────────────────────────────────
                doc.setFillColor(248, 250, 255);
                doc.roundedRect(lm, y, rm - lm, 28, 3, 3, 'F');
                // blue left bar
                doc.setFillColor(58, 91, 217);
                doc.rect(lm, y, 3, 28, 'F');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(17, 24, 39);
                doc.text(itemName, lm + 8, y + 9);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(75, 85, 99);
                doc.text(lender, lm + 8, y + 16);
                doc.text(dates,  lm + 8, y + 22);

                y += 36;

                // ── Section title ─────────────────────────────────────
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(107, 114, 128);
                doc.text('PRICE BREAKDOWN', lm, y);
                y += 5;

                // divider
                doc.setDrawColor(229, 231, 235);
                doc.setLineWidth(0.3);
                doc.line(lm, y, rm, y);
                y += 6;

                // helper: draw a row
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
                    // row separator
                    if (!bold) {
                        doc.setDrawColor(243, 244, 246);
                        doc.setLineWidth(0.2);
                        doc.line(lm, y - 1, rm, y - 1);
                    }
                };

                row(`Base Rate (${toRs(rate)}/day) x ${duration} days`, toRs(subtotal));
                row('Security Deposit (Refundable)', toRs(deposit));
                row('Platform Fee', 'Rs. 0  (Free)', false, [16, 185, 129]);

                // Grand total divider
                doc.setDrawColor(209, 213, 219);
                doc.setLineWidth(0.5);
                doc.line(lm, y, rm, y);
                y += 6;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(17, 24, 39);
                doc.text('Grand Total', lm, y);
                doc.setTextColor(58, 91, 217);
                doc.text(toRs(total), rm, y, { align: 'right' });
                y += 16;

                // ── Footer ────────────────────────────────────────────
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

                const fileNameSlug = itemName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                doc.save(`rentflow_receipt_${fileNameSlug}.pdf`);

            } catch (err) {
                console.error("PDF generation error:", err);
                alert("Failed to generate PDF. Make sure the page is fully loaded.");
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }

    // ========================================
    // 7. RECEIPT MODAL LOGIC
    // ========================================
    window.openReceiptModal = function(bookingId) {
        const booking = allBookings.find(b => b.id === bookingId);
        if (!booking) return;

        document.getElementById("receipt-item").textContent = booking.itemTitle;
        document.getElementById("receipt-lender").textContent = `Lender: ${booking.lenderName}`;
        document.getElementById("receipt-dates").textContent = `${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}`;
        
        document.getElementById("receipt-rate").textContent = `₹${booking.rate.toLocaleString('en-IN')}`;
        document.getElementById("receipt-duration").textContent = booking.duration;
        document.getElementById("receipt-subtotal").textContent = `₹${booking.subtotal.toLocaleString('en-IN')}`;
        document.getElementById("receipt-deposit").textContent = `₹${booking.deposit.toLocaleString('en-IN')}`;
        document.getElementById("receipt-total").textContent = `₹${booking.grandTotal.toLocaleString('en-IN')}`;

        receiptModal.classList.add("show");
    };

    // ========================================
    // 8. UTILITIES
    // ========================================
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
        // 4 Demo Bookings as requested
        const now = new Date();
        
        const d1Start = new Date(now); d1Start.setDate(now.getDate() - 20);
        const d1End = new Date(now); d1End.setDate(now.getDate() - 15);

        const d2Start = new Date(now); d2Start.setDate(now.getDate() - 2);
        const d2End = new Date(now); d2End.setDate(now.getDate() + 3);

        const d3Start = new Date(now); d3Start.setDate(now.getDate() - 40);
        const d3End = new Date(now); d3End.setDate(now.getDate() - 30);

        const d4Start = new Date(now); d4Start.setDate(now.getDate() + 5);
        const d4End = new Date(now); d4End.setDate(now.getDate() + 8);

        return [
            {
                id: 'BKG-001',
                listingId: 'LIST-MOCK-2',
                itemTitle: 'Sony A7S III Mirrorless Camera',
                itemImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=300&q=80',
                lenderName: 'Priya Sharma',
                startDate: d1Start.toISOString().split('T')[0],
                endDate: d1End.toISOString().split('T')[0],
                duration: 5,
                rate: 350,
                subtotal: 1750,
                deposit: 1500,
                platformFee: 0,
                grandTotal: 3250,
                status: 'Completed'
            },
            {
                id: 'BKG-002',
                listingId: 'LIST-MOCK-1',
                itemTitle: 'Apple MacBook Pro M3 (16-inch)',
                itemImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80',
                lenderName: 'Aryan Tyagi',
                startDate: d2Start.toISOString().split('T')[0],
                endDate: d2End.toISOString().split('T')[0],
                duration: 5,
                rate: 500,
                subtotal: 2500,
                deposit: 2000,
                platformFee: 0,
                grandTotal: 4500,
                status: 'Active'
            },
            {
                id: 'BKG-003',
                listingId: 'LIST-MOCK-4',
                itemTitle: 'Bosch Power Drill Set',
                itemImage: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=300&q=80',
                lenderName: 'Ravi Kumar',
                startDate: d3Start.toISOString().split('T')[0],
                endDate: d3End.toISOString().split('T')[0],
                duration: 10,
                rate: 150,
                subtotal: 1500,
                deposit: 500,
                platformFee: 0,
                grandTotal: 2000,
                status: 'Completed'
            },
            {
                id: 'BKG-004',
                listingId: 'LIST-MOCK-3',
                itemTitle: 'DJI Mavic 3 Pro Drone',
                itemImage: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=300&q=80',
                lenderName: 'Kabir Singh',
                startDate: d4Start.toISOString().split('T')[0],
                endDate: d4End.toISOString().split('T')[0],
                duration: 3,
                rate: 600,
                subtotal: 1800,
                deposit: 3000,
                platformFee: 0,
                grandTotal: 4800,
                status: 'Pending'
            }
        ];
    }
});
