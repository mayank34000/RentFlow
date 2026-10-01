/* ============================================================
   RentFlow – Admin Dashboard JavaScript (Platform Moderator)
   Uses shared storage.js for all data access.
   ============================================================ */

// ─── SAMPLE DATA (PHASE 1 — non-persistent) ─────────────────

const sampleReports = [
    { id: 'RP-01', type: 'Listing Report', reason: 'Inappropriate content', status: 'Pending' },
    { id: 'RP-02', type: 'Feedback Report', reason: 'Offensive language', status: 'Reviewed' }
];

function timeAgo(dateVal) {
    if (!dateVal) return '';
    const diff = Math.max(0, Date.now() - new Date(dateVal).getTime());
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return mins + ' min ago';
    if (hours < 24) return hours + ' hr' + (hours > 1 ? 's' : '') + ' ago';
    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
}


// ─── STATE ──────────────────────────────────────────────────

let listingToRemove = null;

// ─── KPI RENDERING ──────────────────────────────────────────

function renderKPIs() {
    const users = getUsers();
    const listings = getListings();
    const bookings = getBookings();
    const revenue = calculateTotalRevenue(bookings);
    const platformFee = calculatePlatformFeeRevenue(listings);
    const premiumUsers = getPremiumUsers(users);

    const kpiUsers = document.getElementById('kpiUsers');
    const kpiSellers = document.getElementById('kpiSellers');
    const kpiListings = document.getElementById('kpiListings');
    const kpiBookings = document.getElementById('kpiBookings');
    const kpiRevenue = document.getElementById('kpiRevenue');
    const kpiPlatformFee = document.getElementById('kpiPlatformFee');
    const kpiPremium = document.getElementById('kpiPremium');

    if (kpiUsers) kpiUsers.textContent = users.length;
    if (kpiSellers) {
        const sellerCount = users.filter(u => (u.role || '').toLowerCase() === 'seller').length;
        kpiSellers.textContent = sellerCount;
    }
    if (kpiListings) kpiListings.textContent = listings.length;
    if (kpiBookings) kpiBookings.textContent = bookings.length;
    if (kpiRevenue) kpiRevenue.textContent = formatCurrency(revenue);
    if (kpiPlatformFee) kpiPlatformFee.textContent = formatCurrency(platformFee);
    if (kpiPremium) kpiPremium.textContent = premiumUsers.length;
}

// ─── RENDER FUNCTIONS ────────────────────────────────────────

function renderListings() {
    const list = document.getElementById('listingList');
    const searchInput = document.getElementById('listingSearch');
    const categorySelect = document.getElementById('listingCategoryFilter');
    const statusSelect = document.getElementById('listingStatusFilter');
    const sortSelect = document.getElementById('listingSort');

    if (!list) return;

    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    const categoryFilter = categorySelect ? categorySelect.value : 'All';
    const statusFilter = statusSelect ? statusSelect.value : 'All';
    const sortVal = sortSelect ? sortSelect.value : 'newest';

    const allListings = getListings();

    // Filter
    let filtered = allListings.filter(listing => {
        const title = listing.title || listing.name || '';
        const matchesSearch = title.toLowerCase().includes(searchQuery) || listing.id.toLowerCase().includes(searchQuery);
        const matchesCategory = categoryFilter === 'All' || listing.category === categoryFilter;
        const matchesStatus = statusFilter === 'All' || listing.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
        const dateA = a.date || a.createdAt || 0;
        const dateB = b.date || b.createdAt || 0;
        const priceA = a.price || a.basePrice || 0;
        const priceB = b.price || b.basePrice || 0;
        if (sortVal === 'newest') return new Date(dateB) - new Date(dateA);
        if (sortVal === 'oldest') return new Date(dateA) - new Date(dateB);
        if (sortVal === 'price-asc') return priceA - priceB;
        if (sortVal === 'price-desc') return priceB - priceA;
        return 0;
    });

    let html = '';

    if (filtered.length === 0) {
        html = '<tr><td colspan="5" style="text-align:center; padding:20px;">No listings found.</td></tr>';
    } else {
        filtered.forEach(listing => {
            let statusClass = 'badge-normal';
            if (listing.status === 'Active') statusClass = 'badge-low'; // green
            if (listing.status === 'Blocked') statusClass = 'badge-blocked';
            if (listing.status === 'Inactive' || listing.status === 'Pending') statusClass = 'badge-orange';

            // Build dynamic actions based on status
            let actionsHtml = `<button class="action-btn" onclick="viewListing('${listing.id}')">View</button>`;
                               
            if (listing.status === 'Active') {
                actionsHtml += `<button class="action-btn" onclick="toggleListing('${listing.id}', 'Disabled')">Disable</button>`;
                actionsHtml += `<button class="action-btn btn-block-text" onclick="toggleListing('${listing.id}', 'Blocked')">Block</button>`;
            } else if (listing.status === 'Blocked') {
                actionsHtml += `<button class="action-btn" onclick="toggleListing('${listing.id}', 'Active')">Unblock</button>`;
            } else if (listing.status === 'Disabled' || listing.status === 'Inactive') {
                actionsHtml += `<button class="action-btn" onclick="toggleListing('${listing.id}', 'Active')">Restore</button>`;
            } else if (listing.status === 'Pending') {
                actionsHtml += `<button class="action-btn" onclick="toggleListing('${listing.id}', 'Active')">Approve</button>`;
            }
            
            actionsHtml += `<button class="action-btn btn-remove-text" onclick="requestRemoveListing('${listing.id}')" style="color: #f87171;">Remove</button>`;

            const title = listing.title || listing.name || 'Unknown';
            const price = listing.price || listing.basePrice || 0;

            html += `
                <tr>
                    <td><strong>${title}</strong><br><small style="color:#9ca3af">${listing.id}</small></td>
                    <td>${listing.category || 'Other'}</td>
                    <td>₹${price.toLocaleString('en-IN')}</td>
                    <td><span class="badge ${statusClass}">${(listing.status || 'Unknown').toUpperCase()}</span></td>
                    <td>${actionsHtml}</td>
                </tr>
            `;
        });
    }

    list.innerHTML = html;
}

function renderBookings() {
    const list = document.getElementById('bookingList');
    if (!list) return;

    const allBookings = getBookings();
    let html = '';

    allBookings.forEach(booking => {
        let statusClass = 'badge-normal';
        if (booking.status === 'Confirmed') statusClass = 'badge-low';
        if (booking.status === 'Cancelled') statusClass = 'badge-orange';
        
        const bookingId = booking.bookingId || booking.id;
        const listingTitle = booking.itemTitle || booking.listing;
        const dates = (booking.startDate && booking.endDate) ? `${booking.startDate} – ${booking.endDate}` : booking.dates;
        const amount = booking.grandTotal || booking.amount || 0;

        html += `
            <tr>
                <td><strong>${bookingId}</strong></td>
                <td>${listingTitle}</td>
                <td>${dates}</td>
                <td>₹${amount.toLocaleString('en-IN')}</td>
                <td><span class="badge ${statusClass}">${booking.status}</span></td>
                <td>
                    <button class="action-btn" onclick="alert('Viewing booking: ${bookingId}')">View</button>
                    ${booking.status === 'Pending' || booking.status === 'Confirmed' ? `<button class="action-btn" style="color: #f87171;" onclick="alert('Cancelling booking: ${bookingId}')">Cancel Booking</button>` : ''}
                    ${booking.status === 'Cancelled' ? `<button class="action-btn" onclick="alert('Reviewing issue for ${bookingId}')">Review Issue</button>` : ''}
                </td>
            </tr>
        `;
    });

    list.innerHTML = html;
}

async function renderFeedbackAndReports() {
    const feedbackEl = document.getElementById('feedbackList');
    const reportEl = document.getElementById('reportList');

    if (feedbackEl) {
        try {
            feedbackEl.innerHTML = '<p style="padding:12px; color:#9ca3af; font-size:14px; text-align:center;">Loading feedback...</p>';
            const res = await window.RentFlowAPI.get('/feedback');
            
            if (!res.success) {
                throw new Error(res.message);
            }
            
            const allFeedback = res.feedbacks || [];
            let fbHtml = '';
            
            if (allFeedback.length === 0) {
                fbHtml = '<p style="padding:12px; color:#9ca3af; font-size:14px; text-align:center;">No feedback submitted yet.</p>';
            } else {
                allFeedback.forEach(fb => {
                    let starsStr = '';
                    for(let i=1; i<=5; i++) starsStr += (i <= fb.rating) ? '★' : '☆';
                    
                    const dateStr = new Date(fb.createdAt).toLocaleDateString();
                    const userName = fb.user ? fb.user.name : 'Unknown User';
                    
                    fbHtml += `
                        <div style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                                <span style="color:#fbbf24">${starsStr}</span>
                            </div>
                            <p style="font-size:14px; margin-bottom: 4px; color: #cbd5e1;">"${fb.comment || 'No comment provided'}"</p>
                            <div style="font-size:12px; color:#6b7280; margin-bottom:8px;">${userName} | ${dateStr}</div>
                            <div>
                                <button class="action-btn" style="color: #f87171;" onclick="removeAdminFeedback('${fb._id}')">Remove</button>
                            </div>
                        </div>
                    `;
                });
            }
            feedbackEl.innerHTML = fbHtml;
        } catch (err) {
            console.error('Error fetching feedback:', err);
            feedbackEl.innerHTML = `<p style="padding:12px; color:#f87171; font-size:14px; text-align:center;">Error loading feedback. <button onclick="renderFeedbackAndReports()" class="action-btn">Retry</button></p>`;
        }
    }

    if (reportEl) {
        let rpHtml = '';
        sampleReports.forEach(rp => {
            let statusClass = rp.status === 'Pending' ? 'badge-orange' : 'badge-low';
            rpHtml += `
                <div style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                        <strong style="font-size: 14px;">${rp.type}</strong>
                        <span class="badge ${statusClass}">${rp.status}</span>
                    </div>
                    <p style="font-size:13px; margin-bottom: 8px; color: #9ca3af;">Reason: ${rp.reason}</p>
                    <div>
                        <button class="action-btn" onclick="alert('Reviewing report ${rp.id}')">Review</button>
                        <button class="action-btn" onclick="alert('Dismissing report ${rp.id}')">Dismiss</button>
                    </div>
                </div>
            `;
        });
        reportEl.innerHTML = rpHtml;
    }
}

function renderActivity() {
    const list = document.getElementById('activityList');
    if (!list) return;

    const events = [];

    // Bookings
    getBookings().forEach(b => {
        const ts = b.bookedAt || b.createdAt;
        const id = b.bookingId || b.id || '';
        const title = b.itemTitle || b.listing || id;
        const status = (b.status || '').toLowerCase();
        let dot = 'dot-blue';
        let text = '';
        if (status === 'confirmed')  { dot = 'dot-green';  text = `Booking confirmed — ${title}`; }
        else if (status === 'cancelled') { dot = 'dot-orange'; text = `Booking cancelled — ${title}`; }
        else if (status === 'completed') { dot = 'dot-green';  text = `Booking completed — ${title}`; }
        else                          { dot = 'dot-blue';   text = `Booking created — ${title}`; }
        if (ts) events.push({ text, dot, ts: new Date(ts).getTime() });
    });

    // Listings
    getListings().forEach(l => {
        const ts = l.createdAt || l.date;
        const title = l.title || l.name || l.id;
        const status = (l.status || '').toLowerCase();
        let dot = 'dot-purple';
        let text = '';
        if (status === 'blocked')  { dot = 'dot-pink';   text = `Listing blocked — ${title}`; }
        else if (status === 'pending') { dot = 'dot-orange'; text = `Listing submitted — ${title}`; }
        else                       { dot = 'dot-purple';  text = `Listing added — ${title}`; }
        if (ts) events.push({ text, dot, ts: new Date(ts).getTime() });
    });

    // Feedback
    getFeedback().forEach(fb => {
        const ts = fb.date || fb.submittedAt;
        const id = fb.id || '';
        if (ts) events.push({ text: `Feedback submitted — ${id}`, dot: 'dot-blue', ts: new Date(ts).getTime() });
    });

    // Sort newest first, cap at 10
    events.sort((a, b) => b.ts - a.ts);
    const recent = events.slice(0, 10);

    if (recent.length === 0) {
        list.innerHTML = '<div style="color:#9ca3af; font-size:14px; padding:12px;">No recent activity.</div>';
        return;
    }

    list.innerHTML = recent.map(item => `
        <div class="activity-item">
            <span class="activity-dot ${item.dot}"></span>
            <span class="activity-text">${item.text}</span>
            <span class="activity-time">${timeAgo(item.ts)}</span>
        </div>
    `).join('');
}
function renderPremiumUsers() {
    const list = document.getElementById('premiumList');
    if (!list) return;

    const allUsers = getUsers();
    const premiumUsers = getPremiumUsers(allUsers);
    let html = '';

    if (premiumUsers.length === 0) {
        html = '<tr><td colspan="6" style="text-align:center; padding:20px;">No premium users found.</td></tr>';
    } else {
        premiumUsers.forEach(u => {
            const purchaseDate = u.premiumPurchaseDate ? new Date(u.premiumPurchaseDate).toLocaleDateString('en-IN') : '—';
            const expiryDate = u.premiumExpiryDate ? new Date(u.premiumExpiryDate).toLocaleDateString('en-IN') : '—';
            html += `
                <tr>
                    <td><strong>${u.username || 'Unknown'}</strong></td>
                    <td>${u.useremail}</td>
                    <td><span class="badge badge-low">Premium Active</span></td>
                    <td>${purchaseDate}</td>
                    <td>${expiryDate}</td>
                    <td><button class="action-btn" onclick="openAdminPremiumDetailModal('${u.useremail}')">View Details</button></td>
                </tr>
            `;
        });
    }

    list.innerHTML = html;
}
// ─── ACTIONS & MODALS ────────────────────────────────────────

function viewListing(id) {
    const listings = getListings();
    const listing = listings.find(l => l.id === id);
    if (!listing) return;

    const row = (label, value) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size:14px;">
            <span style="color:#9ca3af; font-weight:500;">${label}</span>
            <span style="color:#f8fafc; font-weight:600; text-align:right;">${value}</span>
        </div>
    `;

    let html = '';
    const imgUrl = listing.images?.[0] || listing.imageUrl;
    if (imgUrl) {
        html += `<div style="text-align: center; margin-bottom: 16px;"><img src="${imgUrl}" alt="${listing.title || listing.name || 'Listing'}" style="max-width: 100%; max-height: 180px; border-radius: 8px; object-fit: cover;"></div>`;
    }

    if (listing.id) html += row('Listing ID', listing.id);
    const title = listing.title || listing.name;
    if (title) html += row('Title', title);
    if (listing.category) html += row('Category', listing.category);
    if (listing.description || listing.desc) html += row('Description', listing.description || listing.desc);

    const price = listing.price || listing.basePrice;
    if (price !== undefined && price !== null) {
        const period = listing.period ? ` / ${listing.period}` : '';
        html += row('Price', `₹${Number(price).toLocaleString('en-IN')}${period}`);
    }

    const location = listing.location || listing.city || listing.seller?.city || listing.seller?.address;
    if (location) html += row('Location', location);

    const sellerName = typeof listing.seller === 'object' ? listing.seller?.name : listing.seller;
    if (sellerName) html += row('Seller', sellerName);

    if (listing.status) {
        let badgeClass = 'badge-normal';
        if (listing.status === 'Active') badgeClass = 'badge-low';
        if (listing.status === 'Blocked') badgeClass = 'badge-blocked';
        if (listing.status === 'Inactive' || listing.status === 'Pending') badgeClass = 'badge-orange';
        html += row('Status', `<span class="badge ${badgeClass}">${listing.status.toUpperCase()}</span>`);
    }

    if (listing.availability !== undefined) html += row('Availability', listing.availability ? 'Available' : 'Unavailable');

    const content = document.getElementById('adminListingDetailContent');
    if (content) content.innerHTML = html;

    const modal = document.getElementById('adminListingDetailModal');
    if (modal) modal.classList.add('active');
}

function closeAdminListingDetailModal() {
    const modal = document.getElementById('adminListingDetailModal');
    if (modal) modal.classList.remove('active');
}

function editListing(id) {
    // Navigate to edit-listing.html
    window.location.href = `edit-listing.html?id=${id}`;
}

function toggleListing(id, newStatus) {
    const allListings = getListings();
    const listing = allListings.find(l => l.id === id);
    if (listing) {
        listing.status = newStatus;
        saveListings(allListings);
        dispatchStorageUpdate(STORAGE_KEYS.LISTINGS);
        refreshAll();
        showToast(`Listing ${id} is now ${listing.status}.`);
    }
}

function requestRemoveListing(id) {
    listingToRemove = id;
    const modal = document.getElementById('removeListingModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeRemoveModal() {
    listingToRemove = null;
    const modal = document.getElementById('removeListingModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function confirmRemoveListing() {
    if (listingToRemove) {
        const allListings = getListings();
        const updated = allListings.filter(l => l.id !== listingToRemove);
        saveListings(updated);
        dispatchStorageUpdate(STORAGE_KEYS.LISTINGS);
        refreshAll();
        showToast(`Listing ${listingToRemove} successfully removed from the platform.`);
    }
    closeRemoveModal();
}

function removeAdminFeedback(id) {
    if (confirm('Remove this feedback from the platform?')) {
        let allFeedback = getFeedback();
        allFeedback = allFeedback.filter(fb => fb.id !== id);
        saveFeedback(allFeedback);
        dispatchStorageUpdate(STORAGE_KEYS.FEEDBACK);
        refreshAll();
        showToast('Feedback removed successfully.');
    }
}

// ─── TOAST NOTIFICATION ──────────────────────────────────────

function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger reflow for animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if(container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}


// ─── EVENT LISTENERS ─────────────────────────────────────────

function attachFilterListeners() {
    const searchInput = document.getElementById('listingSearch');
    const categorySelect = document.getElementById('listingCategoryFilter');
    const statusSelect = document.getElementById('listingStatusFilter');
    const sortSelect = document.getElementById('listingSort');

    if (searchInput) searchInput.addEventListener('input', renderListings);
    if (categorySelect) categorySelect.addEventListener('change', renderListings);
    if (statusSelect) statusSelect.addEventListener('change', renderListings);
    if (sortSelect) sortSelect.addEventListener('change', renderListings);
}

function openAdminPremiumDetailModal(email) {
    const allUsers = getUsers();
    const user = allUsers.find(u => u.useremail === email);
    if (!user) return;

    const allBookings = getBookings();
    const userBookings = allBookings.filter(b => 
        b.renterEmail === user.useremail || b.renterName === user.username
    );

    const totalSpent = userBookings.reduce((sum, b) => {
        const status = (b.status || '').toLowerCase();
        if (status === 'confirmed' || status === 'completed') {
            return sum + parseFloat(b.grandTotal || b.amount || 0);
        }
        return sum;
    }, 0);

    const purchaseDate = user.premiumPurchaseDate ? new Date(user.premiumPurchaseDate).toLocaleDateString('en-IN') : null;
    const expiryDate = user.premiumExpiryDate ? new Date(user.premiumExpiryDate).toLocaleDateString('en-IN') : '—';
    const registeredDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : null;

    const row = (label, value) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size:14px;">
            <span style="color:#9ca3af; font-weight:500;">${label}</span>
            <span style="color:#f8fafc; font-weight:600;">${value}</span>
        </div>
    `;

    let html = '';
    html += row('Name', user.username || '—');
    html += row('Email', user.useremail || '—');
    if (user.userphone) html += row('Phone', user.userphone);
    html += row('Role', user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—');
    html += row('Membership', '<span class="badge badge-low">Premium Active</span>');
    if (purchaseDate) html += row('Premium Since', purchaseDate);
    html += row('Premium Expires', expiryDate);
    if (registeredDate) html += row('Registered', registeredDate);
    html += row('Total Bookings', userBookings.length);
    html += row('Total Spent', `₹${totalSpent.toLocaleString('en-IN')}`);

    const content = document.getElementById('adminPremiumDetailContent');
    if (content) content.innerHTML = html;

    const modal = document.getElementById('adminPremiumDetailModal');
    if (modal) modal.classList.add('active');
}

function closeAdminPremiumDetailModal() {
    const modal = document.getElementById('adminPremiumDetailModal');
    if (modal) modal.classList.remove('active');
}

function attachModalListeners() {
    const cancelBtn = document.getElementById('cancelRemoveBtn');
    const confirmBtn = document.getElementById('confirmRemoveBtn');
    const closePremiumBtn = document.getElementById('closeAdminPremiumDetailBtn');
    const closeListingBtn = document.getElementById('closeAdminListingDetailBtn');

    if (cancelBtn) cancelBtn.addEventListener('click', closeRemoveModal);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmRemoveListing);
    if (closePremiumBtn) closePremiumBtn.addEventListener('click', closeAdminPremiumDetailModal);
    if (closeListingBtn) closeListingBtn.addEventListener('click', closeAdminListingDetailModal);

    ['adminPremiumDetailModal', 'adminListingDetailModal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        }
    });
}

function initMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const links  = document.getElementById('navLinks');
    const navbar = document.getElementById('navbar');

    if (!toggle || !links) return;

    const closeMenu = () => {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
        const isOpen = links.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    links.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });

    if (navbar) {
        const syncScrolledState = () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        };

        syncScrolledState();
        window.addEventListener('scroll', syncScrolledState, { passive: true });
    }
}

/** Re-render all data-driven sections */
function refreshAll() {
    renderKPIs();
    renderListings();
    renderBookings();
    renderPremiumUsers();
    renderFeedbackAndReports();
    renderActivity();
}

// ─── INITIALISE ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // SECURITY CHECK: Only allow admins
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentUserRaw = localStorage.getItem('current_user');
    let isAdmin = false;
    
    if (isLoggedIn === 'true' && currentUserRaw) {
        try {
            const currentUser = JSON.parse(currentUserRaw);
            if (currentUser.useremail === "admin@rentflow.com" || currentUser.role === "admin") {
                isAdmin = true;
            }
        } catch (e) {
            console.error("Error parsing current_user:", e);
        }
    }
    
    if (!isAdmin) {
        window.location.href = "login.html";
        return;
    }

    // Initial renders
    renderKPIs();
    renderListings();
    renderBookings();
    renderFeedbackAndReports();
    renderActivity();
    
    // Listen for storage changes from OTHER tabs/windows
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.USERS || e.key === STORAGE_KEYS.LISTINGS ||
            e.key === STORAGE_KEYS.BOOKINGS || e.key === STORAGE_KEYS.FEEDBACK) {
            refreshAll();
        }
    });

    // Listen for custom same-tab updates
    window.addEventListener('rentiq_storage_update', (e) => {
        refreshAll();
    });
    
    // Attach events
    initMobileMenu();
    attachFilterListeners();
    attachModalListeners();
});

// ─── ADMIN USER MANAGEMENT (BACKEND API) ────────────────────
async function loadAdminUsers() {
    const list = document.getElementById('userManagementList');
    if (!list) return;

    try {
        list.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">Loading users...</td></tr>';
        
        // Use RentFlowAPI
        const res = await window.RentFlowAPI.get('/admin/users');
        if (res && res.success) {
            renderAdminUsers(res.users);
        } else {
            throw new Error(res.message || 'Failed to fetch users');
        }
    } catch (err) {
        console.error('Error loading users:', err);
        list.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #f87171;">Error loading users. <button onclick="loadAdminUsers()" class="action-btn">Retry</button></td></tr>`;
        showToast('Error loading users: ' + err.message, 'error');
    }
}

function renderAdminUsers(users) {
    const list = document.getElementById('userManagementList');
    if (!list) return;

    if (!users || users.length === 0) {
        list.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">No users found.</td></tr>';
        return;
    }

    let html = '';
    users.forEach(u => {
        const avatar = u.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(u.name || 'User');
        
        // stringify safely for the onclick handler
        const userJson = JSON.stringify({
            _id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            kycStatus: u.kycStatus,
            isPro: u.isPro
        }).replace(/'/g, "&#39;");

        html += `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${avatar}" alt="avatar" style="width:32px; height:32px; border-radius:50%;">
                        <strong style="color:#fff;">${u.name || 'Unknown'}</strong>
                    </div>
                </td>
                <td>${u.email || 'N/A'}</td>
                <td><span class="badge badge-normal" style="text-transform: capitalize;">${u.role || 'customer'}</span></td>
                <td>
                    <span class="badge ${u.isPro ? 'badge-low' : 'badge-normal'}">${u.isPro ? 'Pro' : 'Standard'}</span>
                    <span class="badge ${u.kycStatus === 'approved' ? 'badge-low' : (u.kycStatus === 'pending' ? 'badge-orange' : 'badge-normal')}">${u.kycStatus || 'none'}</span>
                </td>
                <td>
                    <button class="action-btn" onclick='openEditUserModal(${userJson})'>Edit</button>
                    <button class="action-btn" style="color: #f87171;" onclick="deleteAdminUser('${u._id}')">Delete</button>
                </td>
            </tr>
        `;
    });
    list.innerHTML = html;
}

async function deleteAdminUser(id) {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;

    try {
        const res = await window.RentFlowAPI.delete('/admin/users/' + id);
        if (res.success) {
            showToast('User deleted successfully', 'success');
            loadAdminUsers();
        } else {
            throw new Error(res.message);
        }
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Error deleting user: ' + err.message, 'error');
    }
}

function openEditUserModal(user) {
    document.getElementById('editUserId').value = user._id || '';
    document.getElementById('editUserName').value = user.name || '';
    document.getElementById('editUserEmail').value = user.email || '';
    document.getElementById('editUserRole').value = user.role || 'customer';
    document.getElementById('editUserKyc').value = user.kycStatus || 'none';
    document.getElementById('editUserIsPro').checked = !!user.isPro;
    
    document.getElementById('editUserModal').classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    // User Management hooks
    const refreshBtn = document.getElementById('refreshUsersBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAdminUsers);
    }

    const editForm = document.getElementById('editUserForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editUserId').value;
            const payload = {
                name: document.getElementById('editUserName').value,
                email: document.getElementById('editUserEmail').value,
                role: document.getElementById('editUserRole').value,
                kycStatus: document.getElementById('editUserKyc').value,
                isPro: document.getElementById('editUserIsPro').checked
            };
            
            const btn = editForm.querySelector('button[type="submit"]');
            const origText = btn.textContent;
            btn.textContent = 'Saving...';
            btn.disabled = true;

            try {
                const res = await window.RentFlowAPI.patch('/admin/users/' + id, payload);
                if (res.success) {
                    showToast('User updated successfully', 'success');
                    document.getElementById('editUserModal').classList.remove('active');
                    loadAdminUsers();
                } else {
                    throw new Error(res.message);
                }
            } catch (err) {
                console.error('Update error:', err);
                showToast('Error updating user: ' + err.message, 'error');
            } finally {
                btn.textContent = origText;
                btn.disabled = false;
            }
        });
    }

    const closeEditBtn = document.getElementById('closeEditUserBtn');
    if (closeEditBtn) {
        closeEditBtn.addEventListener('click', () => {
            document.getElementById('editUserModal').classList.remove('active');
        });
    }

    // Load initial users if we're on the dashboard
    if (document.getElementById('userManagementList')) {
        setTimeout(loadAdminUsers, 100);
    }
});

// ─── ADMIN FEEDBACK MANAGEMENT (BACKEND API) ─────────────
async function removeAdminFeedback(id) {
    if (!confirm('Are you sure you want to remove this feedback?')) return;

    try {
        const res = await window.RentFlowAPI.delete('/feedback/' + id);
        if (res.success) {
            showToast('Feedback removed', 'success');
            renderFeedbackAndReports();
        } else {
            throw new Error(res.message);
        }
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Error removing feedback: ' + err.message, 'error');
    }
}
