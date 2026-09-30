/* ============================================================
   RentFlow – Analytics JavaScript
   Uses shared storage.js for all data access.
   All shared business logic (calculatePlatformFeeRevenue,
   getPremiumUsers, formatCurrency) lives in storage.js.
   ============================================================ */

// State for pending block/unblock actions
let _pendingBlockId = null;
let _pendingUnblockId = null;

// ─── KPI OVERVIEW ───────────────────────────────────────────

function renderKPIs() {
    const users = getUsers();
    const listings = getListings();
    const bookings = getBookings();
    const revenue = calculateTotalRevenue(bookings);
    const platformFee = calculatePlatformFeeRevenue(listings);
    const premiumUsers = getPremiumUsers(users);
    const activeListings = listings.filter(l => (l.status || '').toLowerCase() === 'active');
    const blockedListings = listings.filter(l => (l.status || '').toLowerCase() === 'blocked');

    const el = id => document.getElementById(id);

    if (el('statUsers'))           el('statUsers').textContent = users.length;
    if (el('statListings'))        el('statListings').textContent = listings.length;
    if (el('statActiveListings'))  el('statActiveListings').textContent = activeListings.length;
    if (el('statBlockedListings')) el('statBlockedListings').textContent = blockedListings.length;
    if (el('statBookings'))        el('statBookings').textContent = bookings.length;
    if (el('statRevenue'))         el('statRevenue').textContent = formatCurrency(revenue);
    if (el('statPlatformFee'))     el('statPlatformFee').textContent = formatCurrency(platformFee);
    if (el('statPremium'))         el('statPremium').textContent = premiumUsers.length;
}

// ─── BOOKING ANALYTICS ──────────────────────────────────────

function renderBookingAnalytics() {
    const container = document.getElementById('bookingAnalyticsBody');
    if (!container) return;
    const bookings = getBookings();

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-text">No booking data available yet.</div>
            </div>
        `;
        return;
    }

    const statusCounts = { 'Pending': 0, 'Confirmed': 0, 'Completed': 0, 'Cancelled': 0 };
    let total = 0;
    bookings.forEach(b => {
        let s = b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1).toLowerCase() : 'Pending';
        if (statusCounts[s] !== undefined) { statusCounts[s]++; } else { statusCounts[s] = 1; }
        total++;
    });

    let html = `<div class="bar-chart">`;
    for (const [status, count] of Object.entries(statusCounts)) {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const fillClass = (status === 'Confirmed' || status === 'Completed') ? 'bar-fill lime-accent' : 'bar-fill';
        html += `
            <div class="bar-row">
                <div class="bar-label">${status}</div>
                <div class="bar-track"><div class="${fillClass}" style="width: ${percentage}%;"></div></div>
                <div class="bar-value">${count}</div>
            </div>
        `;
    }
    html += `</div>`;
    container.innerHTML = html;
}

// ─── REVENUE ANALYTICS ──────────────────────────────────────

function renderRevenueAnalytics() {
    const container = document.getElementById('revenueAnalyticsBody');
    if (!container) return;
    const bookings = getBookings();

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <div class="empty-state-text">No revenue data available yet.</div>
            </div>
        `;
        return;
    }

    let totalRevenue = 0;
    let validBookingsCount = 0;

    bookings.forEach(b => {
        const status = (b.status || '').toLowerCase();
        if (status === 'confirmed' || status === 'completed') {
            const amount = parseFloat(b.grandTotal || b.amount || b.totalPrice || b.price || 0);
            totalRevenue += amount;
            validBookingsCount++;
        }
    });

    const avgBooking = validBookingsCount > 0 ? Math.round(totalRevenue / validBookingsCount) : 0;
    const listings = getListings();
    const platformFee = calculatePlatformFeeRevenue(listings);

    container.innerHTML = `
        <div class="revenue-highlight">₹${totalRevenue.toLocaleString('en-IN')}</div>
        <div class="trend-badge trend-positive">+ Active Revenue</div>
        
        <div class="revenue-stats">
            <div class="stat-item">
                <span class="stat-label">Valid Bookings</span>
                <span class="stat-val">${validBookingsCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Average Booking Value</span>
                <span class="stat-val">₹${avgBooking.toLocaleString('en-IN')}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Platform Fee Revenue (2%)</span>
                <span class="stat-val" style="color:#fbbf24;">${formatCurrency(platformFee)}</span>
            </div>
        </div>
    `;
}

// ─── LISTING PERFORMANCE ────────────────────────────────────

function renderListingPerformance() {
    const tbody = document.getElementById('listingPerformanceBody');
    if (!tbody) return;
    const bookings = getBookings();
    const listings = getListings();

    if (listings.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="4">
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">No listing data available yet.</div>
                </div>
            </td></tr>
        `;
        return;
    }

    const performance = {};
    listings.forEach(l => {
        performance[l.id] = {
            name: l.title || l.name || 'Unknown Listing',
            category: l.category || 'Uncategorized',
            status: l.status || 'Unknown',
            price: parseFloat(l.price || l.basePrice || 0),
            bookings: 0,
            revenue: 0
        };
    });

    bookings.forEach(b => {
        const listingId = b.listingId || '';
        const status = (b.status || '').toLowerCase();
        const amount = parseFloat(b.grandTotal || b.amount || b.totalPrice || b.price || 0);

        if (performance[listingId]) {
            performance[listingId].bookings++;
            if (status === 'confirmed' || status === 'completed') {
                performance[listingId].revenue += amount;
            }
        }
    });

    const sorted = Object.values(performance)
        .filter(p => p.bookings > 0)
        .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
        .slice(0, 5);

    if (sorted.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="4">
                <div class="empty-state">
                    <div class="empty-state-icon">📉</div>
                    <div class="empty-state-text">No booking activity for current listings.</div>
                </div>
            </td></tr>
        `;
        return;
    }

    let html = '';
    sorted.forEach(item => {
        html += `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.category}</td>
                <td>${item.bookings}</td>
                <td>₹${item.revenue.toLocaleString('en-IN')}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ─── CATEGORY DISTRIBUTION ──────────────────────────────────

function renderCategoryDistribution() {
    const container = document.getElementById('categoryAnalyticsBody');
    if (!container) return;
    const listings = getListings();

    if (listings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏷️</div>
                <div class="empty-state-text">No categories available yet.</div>
            </div>
        `;
        return;
    }

    const categories = {};
    listings.forEach(l => {
        const cat = l.category || 'Uncategorized';
        categories[cat] = (categories[cat] || 0) + 1;
    });

    const total = listings.length;
    const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    let html = `<div class="bar-chart">`;
    sortedCats.forEach(([cat, count]) => {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        html += `
            <div class="bar-row">
                <div class="bar-label" style="text-align: left; width: 120px;">${cat}</div>
                <div class="bar-track"><div class="bar-fill" style="width: ${percentage}%;"></div></div>
                <div class="bar-value">${count}</div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// ─── USER OVERVIEW ──────────────────────────────────────────

function renderUserOverview() {
    const container = document.getElementById('userAnalyticsBody');
    if (!container) return;
    const users = getUsers();

    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-text">No user data available yet.</div>
            </div>
        `;
        return;
    }

    const roles = { 'Customer': 0, 'Seller': 0, 'Admin': 0 };
    const total = users.length;
    users.forEach(u => {
        const role = u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1).toLowerCase() : 'Customer';
        if (roles[role] !== undefined) { roles[role]++; } else { roles[role] = 1; }
    });

    const premiumCount = getPremiumUsers(users).length;

    let html = `<div class="bar-chart">`;
    for (const [role, count] of Object.entries(roles)) {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        html += `
            <div class="bar-row">
                <div class="bar-label" style="text-align: left;">${role}</div>
                <div class="bar-track"><div class="bar-fill" style="width: ${percentage}%;"></div></div>
                <div class="bar-value">${count}</div>
            </div>
        `;
    }
    const premiumPct = total > 0 ? Math.round((premiumCount / total) * 100) : 0;
    html += `
        <div class="bar-row">
            <div class="bar-label" style="text-align: left;">⭐ Premium</div>
            <div class="bar-track"><div class="bar-fill lime-accent" style="width: ${premiumPct}%;"></div></div>
            <div class="bar-value">${premiumCount}</div>
        </div>
    `;
    html += `</div>`;
    container.innerHTML = html;
}

// ─── FEEDBACK ANALYTICS ─────────────────────────────────────

function renderFeedbackAnalytics() {
    const container = document.getElementById('feedbackAnalyticsBody');
    if (!container) return;
    const feedback = getFeedback();

    if (feedback.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <div class="empty-state-text">No feedback submitted yet.</div>
            </div>
        `;
        return;
    }

    let totalRating = 0;
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const categoryCounts = {};

    feedback.forEach(fb => {
        const r = parseInt(fb.rating) || 0;
        if (r >= 1 && r <= 5) { ratingCounts[r]++; totalRating += r; }
        const cat = fb.type || 'Other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const totalCount = feedback.length;
    const avgRating = totalCount > 0 ? (totalRating / totalCount).toFixed(1) : '0.0';
    const fullStars = Math.round(parseFloat(avgRating));
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) { starsHtml += (i <= fullStars) ? '★' : '☆'; }

    let html = `
        <div class="rating-overview">
            <div class="average-rating">
                <div class="average-score">${avgRating}</div>
                <div class="average-stars">${starsHtml}</div>
                <div class="rating-total">Based on ${totalCount} reviews</div>
            </div>
            <div class="bar-chart" style="flex: 1; margin-top: 0;">
    `;

    for (let i = 5; i >= 1; i--) {
        const count = ratingCounts[i];
        const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        const fillClass = i >= 4 ? 'bar-fill lime-accent' : 'bar-fill';
        html += `
            <div class="bar-row">
                <div class="bar-label" style="width: 60px;">${i} Stars</div>
                <div class="bar-track"><div class="${fillClass}" style="width: ${percentage}%;"></div></div>
                <div class="bar-value">${count}</div>
            </div>
        `;
    }

    html += `</div></div>`;

    if (Object.keys(categoryCounts).length > 0) {
        html += `<div style="margin-top:24px;"><strong style="font-size:14px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">By Category</strong><div class="bar-chart" style="margin-top:12px;">`;
        const catTotal = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
        Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
            const pct = catTotal > 0 ? Math.round((count / catTotal) * 100) : 0;
            html += `
                <div class="bar-row">
                    <div class="bar-label" style="text-align:left;width:140px;font-size:12px;">${cat}</div>
                    <div class="bar-track"><div class="bar-fill" style="width:${pct}%;"></div></div>
                    <div class="bar-value">${count}</div>
                </div>
            `;
        });
        html += `</div></div>`;
    }

    container.innerHTML = html;
}

// ─── LISTING MANAGEMENT (Admin) ─────────────────────────────

function renderListingManagement() {
    const tbody = document.getElementById('analyticsListingMgmtBody');
    if (!tbody) return;

    const listings = getListings();

    if (listings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#9ca3af;">No listings found.</td></tr>`;
        return;
    }

    let html = '';
    listings.forEach(listing => {
        const title = listing.title || listing.name || 'Unknown';
        const price = listing.price || listing.basePrice || 0;
        const status = listing.status || 'Unknown';
        const sellerName = listing.seller?.name || '—';
        const isBlocked = status.toLowerCase() === 'blocked';

        let badgeClass = 'badge-normal';
        if (status === 'Active') badgeClass = 'badge-low';
        if (status === 'Blocked') badgeClass = 'badge-blocked';
        if (status === 'Inactive' || status === 'Pending') badgeClass = 'badge-orange';

        const blockBtn = isBlocked
            ? `<button class="action-btn" onclick="openUnblockModal('${listing.id}')">Unblock</button>`
            : `<button class="action-btn btn-block-text" onclick="openBlockModal('${listing.id}')">Block Listing</button>`;

        html += `
            <tr>
                <td><strong>${title}</strong><br><small style="color:#9ca3af">${listing.id}</small></td>
                <td>${listing.category || 'Other'}</td>
                <td>₹${price.toLocaleString('en-IN')}</td>
                <td>${sellerName}</td>
                <td><span class="badge ${badgeClass}">${status.toUpperCase()}</span></td>
                <td>
                    <button class="action-btn" onclick="openListingDetailModal('${listing.id}')">View</button>
                    ${blockBtn}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ─── BLOCKED LISTINGS SECTION ───────────────────────────────

function renderBlockedListings() {
    const container = document.getElementById('blockedListingsContainer');
    if (!container) return;

    const listings = getListings();
    const blocked = listings.filter(l => (l.status || '').toLowerCase() === 'blocked');

    if (blocked.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="padding: 32px; text-align: center; color: var(--text-secondary);">
                <div style="font-size: 32px; opacity: 0.4; margin-bottom: 12px;">✅</div>
                <p style="font-size: 15px;">No blocked listings at the moment.</p>
            </div>
        `;
        return;
    }

    let html = `<div class="glass-card table-card"><div class="table-responsive"><table class="platform-table">
        <thead>
            <tr>
                <th>Listing</th>
                <th>Category</th>
                <th>Seller / Host</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>`;

    blocked.forEach(listing => {
        const title = listing.title || listing.name || 'Unknown';
        const price = listing.price || listing.basePrice || 0;
        const sellerName = listing.seller?.name || '—';

        html += `
            <tr>
                <td><strong>${title}</strong><br><small style="color:#9ca3af">${listing.id}</small></td>
                <td>${listing.category || 'Other'}</td>
                <td>${sellerName}</td>
                <td>₹${price.toLocaleString('en-IN')}${listing.period ? '/' + listing.period : ''}</td>
                <td><span class="badge badge-blocked">BLOCKED</span></td>
                <td>
                    <button class="action-btn" onclick="openListingDetailModal('${listing.id}')">View</button>
                    <button class="action-btn" onclick="openUnblockModal('${listing.id}')">Unblock</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

// ─── PREMIUM USERS (Analytics) ──────────────────────────────

function renderPremiumUsersAnalytics() {
    const tbody = document.getElementById('analyticsPremiumBody');
    if (!tbody) return;

    const allUsers = getUsers();
    const premiumUsers = getPremiumUsers(allUsers);

    if (premiumUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#9ca3af;">No premium users found.</td></tr>`;
        return;
    }

    let html = '';
    premiumUsers.forEach(u => {
        const expiryDate = u.premiumExpiryDate
            ? new Date(u.premiumExpiryDate).toLocaleDateString('en-IN')
            : '—';

        html += `
            <tr>
                <td><strong>${u.username || 'Unknown'}</strong></td>
                <td>${u.useremail || '—'}</td>
                <td><span class="badge badge-low">Premium Active</span></td>
                <td>${expiryDate}</td>
                <td>
                    <button class="action-btn" onclick="openPremiumDetailModal('${u.useremail}')">View Details</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ─── BLOCK / UNBLOCK ACTIONS ────────────────────────────────

function openBlockModal(id) {
    _pendingBlockId = id;
    const modal = document.getElementById('blockListingModal');
    if (modal) modal.classList.add('active');
}

function closeBlockModal() {
    _pendingBlockId = null;
    const modal = document.getElementById('blockListingModal');
    if (modal) modal.classList.remove('active');
}

function confirmBlock() {
    if (!_pendingBlockId) return;
    const allListings = getListings();
    const listing = allListings.find(l => l.id === _pendingBlockId);
    if (listing) {
        if (listing.status !== 'Blocked') {
            listing.previousStatus = listing.status;
        }
        listing.status = 'Blocked';
        saveListings(allListings);
        dispatchStorageUpdate(STORAGE_KEYS.LISTINGS);
        refreshAll();
        showToast(`"${listing.title || listing.id}" has been blocked.`);
    }
    closeBlockModal();
}

function openUnblockModal(id) {
    _pendingUnblockId = id;
    const modal = document.getElementById('unblockListingModal');
    if (modal) modal.classList.add('active');
}

function closeUnblockModal() {
    _pendingUnblockId = null;
    const modal = document.getElementById('unblockListingModal');
    if (modal) modal.classList.remove('active');
}

function confirmUnblock() {
    if (!_pendingUnblockId) return;
    const allListings = getListings();
    const listing = allListings.find(l => l.id === _pendingUnblockId);
    if (listing) {
        const validStatuses = ['Active', 'Inactive', 'Pending', 'Disabled'];
        const prev = listing.previousStatus;
        listing.status = (prev && prev !== 'Blocked' && validStatuses.includes(prev)) ? prev : 'Active';
        delete listing.previousStatus;
        saveListings(allListings);
        dispatchStorageUpdate(STORAGE_KEYS.LISTINGS);
        refreshAll();
        showToast(`"${listing.title || listing.id}" is now ${listing.status}.`);
    }
    closeUnblockModal();
}

// ─── LISTING DETAIL MODAL ─────────────────────────────────────

function openListingDetailModal(id) {
    const listings = getListings();
    const listing = listings.find(l => l.id === id);
    if (!listing) return;

    const row = (label, value) => `
        <div class="premium-detail-row">
            <span class="premium-detail-label">${label}</span>
            <span class="premium-detail-value" style="text-align: right;">${value}</span>
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

    const content = document.getElementById('listingDetailContent');
    if (content) content.innerHTML = html;

    const modal = document.getElementById('listingDetailModal');
    if (modal) modal.classList.add('active');
}

function closeListingDetailModal() {
    const modal = document.getElementById('listingDetailModal');
    if (modal) modal.classList.remove('active');
}

// ─── PREMIUM USER DETAIL MODAL ───────────────────────────────

function openPremiumDetailModal(email) {
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

    const purchaseDate = user.premiumPurchaseDate
        ? new Date(user.premiumPurchaseDate).toLocaleDateString('en-IN')
        : null;
    const expiryDate = user.premiumExpiryDate
        ? new Date(user.premiumExpiryDate).toLocaleDateString('en-IN')
        : '—';
    const registeredDate = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-IN')
        : null;

    const row = (label, value) => `
        <div class="premium-detail-row">
            <span class="premium-detail-label">${label}</span>
            <span class="premium-detail-value">${value}</span>
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

    const content = document.getElementById('premiumDetailContent');
    if (content) content.innerHTML = html;

    const modal = document.getElementById('premiumDetailModal');
    if (modal) modal.classList.add('active');
}

function closePremiumDetailModal() {
    const modal = document.getElementById('premiumDetailModal');
    if (modal) modal.classList.remove('active');
}

// ─── TOAST ──────────────────────────────────────────────────

function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) container.removeChild(toast);
        }, 300);
    }, 3000);
}

// ─── MOBILE MENU ────────────────────────────────────────────

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
        link.addEventListener('click', closeMenu);
    });

    if (navbar) {
        const syncScrolledState = () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        };
        syncScrolledState();
        window.addEventListener('scroll', syncScrolledState, { passive: true });
    }
}

// ─── MODAL WIRING ────────────────────────────────────────────

function attachModalListeners() {
    const cancelBlock   = document.getElementById('cancelBlockBtn');
    const confirmBlock  = document.getElementById('confirmBlockBtn');
    const cancelUnblock = document.getElementById('cancelUnblockBtn');
    const confirmUnblock = document.getElementById('confirmUnblockBtn');
    const closePremium  = document.getElementById('closePremiumDetailBtn');
    const closeListing  = document.getElementById('closeListingDetailBtn');

    if (cancelBlock)    cancelBlock.addEventListener('click', closeBlockModal);
    if (confirmBlock)   confirmBlock.addEventListener('click', confirmBlock_handler);
    if (cancelUnblock)  cancelUnblock.addEventListener('click', closeUnblockModal);
    if (confirmUnblock) confirmUnblock.addEventListener('click', confirmUnblock_handler);
    if (closePremium)   closePremium.addEventListener('click', closePremiumDetailModal);
    if (closeListing)   closeListing.addEventListener('click', closeListingDetailModal);

    ['blockListingModal', 'unblockListingModal', 'premiumDetailModal', 'listingDetailModal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    _pendingBlockId = null;
                    _pendingUnblockId = null;
                }
            });
        }
    });
}

function confirmBlock_handler() { confirmBlock(); }
function confirmUnblock_handler() { confirmUnblock(); }

// ─── REFRESH ALL ─────────────────────────────────────────────

function refreshAll() {
    renderKPIs();
    renderBookingAnalytics();
    renderRevenueAnalytics();
    renderListingPerformance();
    renderCategoryDistribution();
    renderUserOverview();
    renderFeedbackAnalytics();
    renderListingManagement();
    renderBlockedListings();
    renderPremiumUsersAnalytics();
}

// ─── INITIALISE ─────────────────────────────────────────────

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

    refreshAll();
    initMobileMenu();
    attachModalListeners();

    // Cross-tab storage changes
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.USERS || e.key === STORAGE_KEYS.LISTINGS ||
            e.key === STORAGE_KEYS.BOOKINGS || e.key === STORAGE_KEYS.FEEDBACK) {
            refreshAll();
        }
    });

    // Same-tab updates dispatched by dispatchStorageUpdate()
    window.addEventListener('rentiq_storage_update', () => {
        refreshAll();
    });
});
