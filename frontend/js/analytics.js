/* ============================================================
   RentFlow – Analytics Dashboard JavaScript
   ============================================================
   Sections:
   1.  State & Chart Instance Registry
   2.  Chart.js Global Defaults
   3.  Loading / Error / Content toggles
   4.  Last Updated timestamp
   5.  KPI Cards (backend data)
   6.  Role Donut Chart
   7.  KYC Pie/Donut Chart
   8.  Pro vs Non-Pro Bar Chart
   9.  Registration Trend Line/Area Chart
   10. Rating Distribution Bar Chart
   11. Rating Donut Chart
   12. Feedback Trend Line/Area Chart
   13. Analytics Summary
   14. Booking Analytics (storage.js – teammate)
   15. Revenue Analytics (storage.js – teammate)
   16. Listing Performance Table (storage.js – teammate)
   17. Category Distribution (storage.js – teammate)
   18. Listing Management Table (storage.js – teammate)
   19. Blocked Listings (storage.js – teammate)
   20. Premium Users Table (storage.js – teammate)
   21. Block / Unblock Actions & Modals
   22. Toast Notification
   23. Mobile Menu
   24. refreshAll (main orchestrator)
   25. DOMContentLoaded Init
   ============================================================ */

// ─── 1. STATE & CHART INSTANCE REGISTRY ──────────────────────

let _pendingBlockId   = null;
let _pendingUnblockId = null;
let backendAnalytics  = null; // data from GET /api/admin/analytics/overview

// All Chart.js instances are stored here.
// Before recreating any chart, call destroyChart(key).
const charts = {
    role:           null,
    kyc:            null,
    pro:            null,
    registration:   null,
    rating:         null,
    ratingDonut:    null,
    feedbackTrend:  null
};

// ─── 2. CHART.JS GLOBAL DEFAULTS ────────────────────────────

function applyChartDefaults() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.color           = 'rgba(148, 163, 184, 0.85)';
    Chart.defaults.font.family     = "'Inter', 'Manrope', sans-serif";
    Chart.defaults.font.size       = 12;
    Chart.defaults.plugins.legend.labels.boxWidth  = 12;
    Chart.defaults.plugins.legend.labels.padding   = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10, 18, 40, 0.92)';
    Chart.defaults.plugins.tooltip.borderColor      = 'rgba(255,255,255,0.08)';
    Chart.defaults.plugins.tooltip.borderWidth      = 1;
    Chart.defaults.plugins.tooltip.padding          = 12;
    Chart.defaults.plugins.tooltip.titleFont        = { size: 13, weight: '600' };
    Chart.defaults.plugins.tooltip.bodyFont         = { size: 12 };
    Chart.defaults.plugins.tooltip.cornerRadius     = 10;
}

// ─── 3. LOADING / ERROR / CONTENT TOGGLES ────────────────────

function showLoading() {
    setDisplay('analyticsLoading', 'flex');
    setDisplay('analyticsError',   'none');
    setDisplay('analyticsContent', 'none');
}

function showError(message) {
    setDisplay('analyticsLoading', 'none');
    setDisplay('analyticsError',   'flex');
    setDisplay('analyticsContent', 'none');
    const msgEl = document.getElementById('analyticsErrorMsg');
    if (msgEl) msgEl.textContent = message || 'An unexpected error occurred. Please try again.';
}

function showContent() {
    setDisplay('analyticsLoading', 'none');
    setDisplay('analyticsError',   'none');
    setDisplay('analyticsContent', 'block');
}

function setDisplay(id, value) {
    const el = document.getElementById(id);
    if (el) el.style.display = value;
}

// ─── 4. LAST UPDATED TIMESTAMP ───────────────────────────────

function updateLastUpdated() {
    const el = document.getElementById('lastUpdatedLabel');
    if (!el) return;
    const now = new Date();
    el.textContent = `Last updated: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

// ─── 5. KPI CARDS ────────────────────────────────────────────

function renderKPIs() {
    const el  = id => document.getElementById(id);

    // Backend-powered KPIs
    if (backendAnalytics && backendAnalytics.userStats) {
        const { totalUsers, proUsers, nonProUsers, kycDistribution } = backendAnalytics.userStats;
        const total = totalUsers || 0;
        const pro   = proUsers   || 0;
        const std   = nonProUsers || (total - pro);

        if (el('statUsers'))  el('statUsers').textContent  = total.toLocaleString();
        if (el('statPremium')) el('statPremium').textContent = pro.toLocaleString();
        if (el('statNonPro')) el('statNonPro').textContent  = std.toLocaleString();

        if (el('kpiSubUsers'))  el('kpiSubUsers').textContent  = `Registered on platform`;
        if (el('kpiSubPro'))    el('kpiSubPro').textContent    = total > 0 ? `${Math.round((pro / total) * 100)}% of users` : '';
        if (el('kpiSubNonPro')) el('kpiSubNonPro').textContent = total > 0 ? `${Math.round((std / total) * 100)}% of users` : '';

        // Pending KYC from kycDistribution
        if (kycDistribution && Array.isArray(kycDistribution)) {
            const pendingEntry = kycDistribution.find(k => (k._id || '').toLowerCase() === 'pending');
            const pendingCount = pendingEntry ? pendingEntry.count : 0;
            if (el('statPendingKyc')) el('statPendingKyc').textContent = pendingCount.toLocaleString();
            if (el('kpiSubKyc'))      el('kpiSubKyc').textContent      = pendingCount > 0 ? 'Awaiting verification' : 'No pending verifications';
        } else {
            if (el('statPendingKyc')) el('statPendingKyc').textContent = '—';
        }
    }

    if (backendAnalytics && backendAnalytics.feedbackStats) {
        const { totalFeedback, averageRating } = backendAnalytics.feedbackStats;
        const count = totalFeedback || 0;
        const avg   = Number(averageRating || 0).toFixed(1);

        if (el('statFeedback'))  el('statFeedback').textContent  = count.toLocaleString();
        if (el('statAvgRating')) el('statAvgRating').textContent = avg;

        if (el('kpiSubFeedback')) el('kpiSubFeedback').textContent = count > 0 ? 'User reviews collected' : 'No feedback yet';
        if (el('kpiSubRating'))   el('kpiSubRating').textContent   = count > 0 ? `out of 5.0 (${count} reviews)` : 'No ratings yet';
    }

    // Storage.js-powered KPIs (Listing & Booking — teammate data)
    const listings        = getListings();
    const bookings        = getBookings();
    const revenue         = calculateTotalRevenue(bookings);
    const platformFee     = calculatePlatformFeeRevenue(listings);
    const activeListings  = listings.filter(l => (l.status || '').toLowerCase() === 'active');
    const blockedListings = listings.filter(l => (l.status || '').toLowerCase() === 'blocked');
    const premiumUsersMock = getPremiumUsers(getUsers());

    // If backend didn't populate user counts, fall back to storage.js
    if (!backendAnalytics || !backendAnalytics.userStats) {
        const users = getUsers();
        if (el('statUsers'))  el('statUsers').textContent  = users.length.toLocaleString();
        if (el('statPremium')) el('statPremium').textContent = premiumUsersMock.length.toLocaleString();
        if (el('statNonPro')) el('statNonPro').textContent  = (users.length - premiumUsersMock.length).toLocaleString();
        if (el('statPendingKyc')) el('statPendingKyc').textContent = '—';
    }
    if (!backendAnalytics || !backendAnalytics.feedbackStats) {
        const fb = getFeedback();
        if (el('statFeedback'))  el('statFeedback').textContent  = fb.length.toLocaleString();
        if (el('statAvgRating')) el('statAvgRating').textContent = '—';
    }

    // Hidden elements in old HTML — kept for backward compat if still referenced
    if (el('statListings'))        el('statListings').textContent        = listings.length;
    if (el('statActiveListings'))  el('statActiveListings').textContent  = activeListings.length;
    if (el('statBlockedListings')) el('statBlockedListings').textContent = blockedListings.length;
    if (el('statBookings'))        el('statBookings').textContent        = bookings.length;
    if (el('statRevenue'))         el('statRevenue').textContent         = formatCurrency(revenue);
    if (el('statPlatformFee'))     el('statPlatformFee').textContent     = formatCurrency(platformFee);
}

// ─── 6. ROLE DONUT CHART ─────────────────────────────────────

function renderRoleChart() {
    const canvasEl = document.getElementById('chartRole');
    const emptyEl  = document.getElementById('chartRoleEmpty');
    destroyChart('role');

    if (!canvasEl) return;

    const dist = backendAnalytics?.userStats?.roleDistribution || [];

    if (!dist.length) {
        if (canvasEl) canvasEl.style.display = 'none';
        if (emptyEl)  emptyEl.style.display  = 'flex';
        return;
    }

    if (canvasEl) canvasEl.style.display = '';
    if (emptyEl)  emptyEl.style.display  = 'none';

    const labels = dist.map(r => capitalize(r._id || 'Unknown'));
    const data   = dist.map(r => r.count || 0);

    if (data.every(v => v === 0)) {
        if (canvasEl) canvasEl.style.display = 'none';
        if (emptyEl)  emptyEl.style.display  = 'flex';
        return;
    }

    charts.role = new Chart(canvasEl, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
                borderColor:     'rgba(10,18,40,0.8)',
                borderWidth:     3,
                hoverOffset:     8
            }]
        },
        options: {
            responsive:  true,
            maintainAspectRatio: true,
            cutout: '62%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} users`
                    }
                }
            },
            animation: { duration: 800, easing: 'easeInOutQuart' }
        }
    });
}

// ─── 7. KYC PIE/DONUT CHART ──────────────────────────────────

function renderKycChart() {
    const canvasEl = document.getElementById('chartKyc');
    const emptyEl  = document.getElementById('chartKycEmpty');
    destroyChart('kyc');

    if (!canvasEl) return;

    const dist = backendAnalytics?.userStats?.kycDistribution || [];

    if (!dist.length) {
        if (canvasEl) canvasEl.style.display = 'none';
        if (emptyEl)  emptyEl.style.display  = 'flex';
        return;
    }

    if (canvasEl) canvasEl.style.display = '';
    if (emptyEl)  emptyEl.style.display  = 'none';

    const kycColors = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', none: '#6b7280' };

    const labels = dist.map(k => capitalize(k._id || 'none'));
    const data   = dist.map(k => k.count || 0);
    const colors = dist.map(k => kycColors[(k._id || 'none').toLowerCase()] || '#6366f1');

    if (data.every(v => v === 0)) {
        if (canvasEl) canvasEl.style.display = 'none';
        if (emptyEl)  emptyEl.style.display  = 'flex';
        return;
    }

    charts.kyc = new Chart(canvasEl, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: 'rgba(10,18,40,0.8)',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} users`
                    }
                }
            },
            animation: { duration: 800, easing: 'easeInOutQuart' }
        }
    });
}

// ─── 8. PRO VS NON-PRO BAR CHART ─────────────────────────────

function renderProChart() {
    const canvasEl = document.getElementById('chartPro');
    const emptyEl  = document.getElementById('chartProEmpty');
    destroyChart('pro');

    if (!canvasEl) return;

    const userStats = backendAnalytics?.userStats;
    const pro = userStats?.proUsers    || 0;
    const std = userStats?.nonProUsers || (userStats ? (userStats.totalUsers - pro) : 0);

    if (pro === 0 && std === 0) {
        if (canvasEl) canvasEl.style.display = 'none';
        if (emptyEl)  emptyEl.style.display  = 'flex';
        return;
    }

    if (canvasEl) canvasEl.style.display = '';
    if (emptyEl)  emptyEl.style.display  = 'none';

    charts.pro = new Chart(canvasEl, {
        type: 'bar',
        data: {
            labels: ['Standard', 'Pro / Premium'],
            datasets: [{
                label: 'Users',
                data: [std, pro],
                backgroundColor: ['rgba(99, 102, 241, 0.7)', 'rgba(16, 185, 129, 0.8)'],
                borderColor:     ['#6366f1', '#10b981'],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} users`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: 'rgba(148,163,184,0.8)' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: 'rgba(148,163,184,0.8)',
                        precision: 0
                    }
                }
            },
            animation: { duration: 700 }
        }
    });
}

// ─── 9. REGISTRATION TREND LINE/AREA CHART ───────────────────

function renderRegistrationTrend() {
    const canvasEl = document.getElementById('chartRegistration');
    const emptyEl  = document.getElementById('chartRegistrationEmpty');
    destroyChart('registration');

    if (!canvasEl) return;

    const trend = backendAnalytics?.userStats?.registrationTrend || [];

    if (!trend.length) {
        if (canvasEl) canvasEl.style.display = 'none';
        if (emptyEl)  emptyEl.style.display  = 'flex';
        return;
    }

    if (canvasEl) canvasEl.style.display = '';
    if (emptyEl)  emptyEl.style.display  = 'none';

    // Show at most last 60 data points to stay readable
    const recent = trend.slice(-60);
    const labels = recent.map(t => formatDateLabel(t._id));
    const data   = recent.map(t => t.count || 0);

    charts.registration = new Chart(canvasEl, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'New Registrations',
                data,
                borderColor:     '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                pointBackgroundColor: '#3b82f6',
                pointBorderColor:    'rgba(10,18,40,0.8)',
                pointRadius:     data.length > 30 ? 2 : 4,
                pointHoverRadius: 7,
                borderWidth:  2.5,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: items => items[0].label,
                        label: ctx  => ` ${ctx.parsed.y} sign-ups`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: 'rgba(148,163,184,0.8)',
                        maxTicksLimit: 12,
                        maxRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: 'rgba(148,163,184,0.8)',
                        precision: 0
                    }
                }
            },
            animation: { duration: 900 }
        }
    });
}

// ─── 10. RATING DISTRIBUTION BAR CHART ──────────────────────

function renderRatingChart() {
    const canvasEl = document.getElementById('chartRating');
    const emptyEl  = document.getElementById('chartRatingEmpty');
    destroyChart('rating');

    if (!canvasEl) return;

    const dist = backendAnalytics?.feedbackStats?.ratingDistribution || [];

    // Build a 1–5 map
    const map = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    dist.forEach(r => { if (map[r._id] !== undefined) map[r._id] = r.count || 0; });
    const total = Object.values(map).reduce((a, b) => a + b, 0);

    if (total === 0) {
        if (canvasEl) canvasEl.style.display = 'none';
        if (emptyEl)  emptyEl.style.display  = 'flex';
        return;
    }

    if (canvasEl) canvasEl.style.display = '';
    if (emptyEl)  emptyEl.style.display  = 'none';

    const labels = ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'];
    const data   = [map[1], map[2], map[3], map[4], map[5]];
    const colors = [
        'rgba(239,68,68,0.75)',
        'rgba(249,115,22,0.75)',
        'rgba(234,179,8,0.75)',
        'rgba(34,197,94,0.75)',
        'rgba(16,185,129,0.85)'
    ];

    charts.rating = new Chart(canvasEl, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Reviews',
                data,
                backgroundColor: colors,
                borderColor:     colors.map(c => c.replace('0.75', '1').replace('0.85', '1')),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'x',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} reviews`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: 'rgba(148,163,184,0.8)' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: 'rgba(148,163,184,0.8)',
                        precision: 0
                    }
                }
            },
            animation: { duration: 700 }
        }
    });
}

// ─── 11. RATING DONUT CHART ─────────────────────────────────

function renderRatingDonutChart() {
    const canvasEl = document.getElementById('chartRatingDonut');
    const emptyEl  = document.getElementById('chartRatingDonutEmpty');
    destroyChart('ratingDonut');

    if (!canvasEl) return;

    const dist = backendAnalytics?.feedbackStats?.ratingDistribution || [];
    const map  = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    dist.forEach(r => { if (map[r._id] !== undefined) map[r._id] = r.count || 0; });
    const total = Object.values(map).reduce((a, b) => a + b, 0);

    if (total === 0) {
        if (canvasEl) canvasEl.style.display = 'none';
        if (emptyEl)  emptyEl.style.display  = 'flex';
        return;
    }

    if (canvasEl) canvasEl.style.display = '';
    if (emptyEl)  emptyEl.style.display  = 'none';

    charts.ratingDonut = new Chart(canvasEl, {
        type: 'doughnut',
        data: {
            labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
            datasets: [{
                data:  [map[1], map[2], map[3], map[4], map[5]],
                backgroundColor: [
                    'rgba(239,68,68,0.8)',
                    'rgba(249,115,22,0.8)',
                    'rgba(234,179,8,0.8)',
                    'rgba(34,197,94,0.8)',
                    'rgba(16,185,129,0.9)'
                ],
                borderColor: 'rgba(10,18,40,0.8)',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '58%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} reviews`
                    }
                }
            },
            animation: { duration: 800, easing: 'easeInOutQuart' }
        }
    });
}

// ─── 12. FEEDBACK TREND LINE/AREA CHART ─────────────────────

function renderFeedbackTrendChart() {
    const canvasEl = document.getElementById('chartFeedbackTrend');
    const emptyEl  = document.getElementById('chartFeedbackTrendEmpty');
    destroyChart('feedbackTrend');

    if (!canvasEl) return;

    const trend = backendAnalytics?.feedbackStats?.feedbackTrend || [];

    if (!trend.length) {
        if (canvasEl) canvasEl.style.display = 'none';
        if (emptyEl)  emptyEl.style.display  = 'flex';
        return;
    }

    if (canvasEl) canvasEl.style.display = '';
    if (emptyEl)  emptyEl.style.display  = 'none';

    const recent = trend.slice(-60);
    const labels = recent.map(t => formatDateLabel(t._id));
    const data   = recent.map(t => t.count || 0);

    charts.feedbackTrend = new Chart(canvasEl, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Feedback Submitted',
                data,
                borderColor:     '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                pointBackgroundColor: '#10b981',
                pointBorderColor:    'rgba(10,18,40,0.8)',
                pointRadius:     data.length > 30 ? 2 : 4,
                pointHoverRadius: 7,
                borderWidth:  2.5,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: items => items[0].label,
                        label: ctx  => ` ${ctx.parsed.y} submissions`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: 'rgba(148,163,184,0.8)',
                        maxTicksLimit: 12,
                        maxRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: 'rgba(148,163,184,0.8)',
                        precision: 0
                    }
                }
            },
            animation: { duration: 900 }
        }
    });
}

// ─── 13. ANALYTICS SUMMARY ───────────────────────────────────

function renderSummary() {
    const container = document.getElementById('analyticsSummary');
    if (!container) return;

    const facts = [];

    if (backendAnalytics && backendAnalytics.userStats) {
        const { totalUsers, roleDistribution, proUsers, nonProUsers, kycDistribution } = backendAnalytics.userStats;

        // Largest role
        if (Array.isArray(roleDistribution) && roleDistribution.length) {
            const topRole = roleDistribution.reduce((a, b) => ((b.count || 0) > (a.count || 0) ? b : a), {});
            if (topRole._id) {
                facts.push({
                    icon: '👤',
                    label: 'Largest User Role',
                    value: capitalize(topRole._id),
                    sub:   `${topRole.count} users`
                });
            }
        }

        // Pro percentage
        if (totalUsers > 0) {
            const proPct = Math.round(((proUsers || 0) / totalUsers) * 100);
            facts.push({
                icon: '⭐',
                label: 'Pro User Adoption',
                value: `${proPct}%`,
                sub:   `${proUsers || 0} of ${totalUsers} users`
            });
        }

        // Most common KYC status
        if (Array.isArray(kycDistribution) && kycDistribution.length) {
            const topKyc = kycDistribution.reduce((a, b) => ((b.count || 0) > (a.count || 0) ? b : a), {});
            if (topKyc._id) {
                facts.push({
                    icon: '🪪',
                    label: 'Most Common KYC Status',
                    value: capitalize(topKyc._id),
                    sub:   `${topKyc.count} users`
                });
            }
        }
    }

    if (backendAnalytics && backendAnalytics.feedbackStats) {
        const { averageRating, totalFeedback, ratingDistribution } = backendAnalytics.feedbackStats;

        if (totalFeedback > 0) {
            facts.push({
                icon: '★',
                label: 'Average Platform Rating',
                value: Number(averageRating || 0).toFixed(2),
                sub:   `out of 5.00 across ${totalFeedback} reviews`
            });
        }

        // Most common rating
        if (Array.isArray(ratingDistribution) && ratingDistribution.length) {
            const topRating = ratingDistribution.reduce((a, b) => ((b.count || 0) > (a.count || 0) ? b : a), {});
            if (topRating._id) {
                facts.push({
                    icon: '💬',
                    label: 'Most Frequent Rating',
                    value: `${topRating._id} Star${topRating._id !== 1 ? 's' : ''}`,
                    sub:   `${topRating.count} reviews`
                });
            }
        }
    }

    if (!facts.length) {
        container.innerHTML = `
            <div class="summary-empty">
                <span>No summary data available — connect the backend to see insights.</span>
            </div>
        `;
        return;
    }

    let html = '<div class="summary-grid">';
    facts.forEach(f => {
        html += `
            <div class="summary-fact">
                <div class="summary-fact-icon">${f.icon}</div>
                <div class="summary-fact-body">
                    <div class="summary-fact-label">${f.label}</div>
                    <div class="summary-fact-value">${f.value}</div>
                    ${f.sub ? `<div class="summary-fact-sub">${f.sub}</div>` : ''}
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ─── 14. BOOKING ANALYTICS (storage.js) ─────────────────────

function renderBookingAnalytics() {
    const container = document.getElementById('bookingAnalyticsBody');
    if (!container) return;
    const bookings = getBookings();

    if (bookings.length === 0) {
        container.innerHTML = emptyStateHtml('📦', 'No booking data available yet.');
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
        const fillClass  = (status === 'Confirmed' || status === 'Completed') ? 'bar-fill lime-accent' : 'bar-fill';
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

// ─── 15. REVENUE ANALYTICS (storage.js) ─────────────────────

function renderRevenueAnalytics() {
    const container = document.getElementById('revenueAnalyticsBody');
    if (!container) return;
    const bookings = getBookings();

    if (bookings.length === 0) {
        container.innerHTML = emptyStateHtml('💰', 'No revenue data available yet.');
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

    const avgBooking  = validBookingsCount > 0 ? Math.round(totalRevenue / validBookingsCount) : 0;
    const listings    = getListings();
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

// ─── 16. LISTING PERFORMANCE TABLE (storage.js) ─────────────

function renderListingPerformance() {
    const tbody = document.getElementById('listingPerformanceBody');
    if (!tbody) return;
    const bookings = getBookings();
    const listings = getListings();

    if (listings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">${emptyStateHtml('📋', 'No listing data available yet.')}</td></tr>`;
        return;
    }

    const performance = {};
    listings.forEach(l => {
        performance[l.id] = {
            name:     l.title || l.name || 'Unknown Listing',
            category: l.category || 'Uncategorized',
            bookings: 0,
            revenue:  0
        };
    });
    bookings.forEach(b => {
        const listingId = b.listingId || '';
        const status    = (b.status || '').toLowerCase();
        const amount    = parseFloat(b.grandTotal || b.amount || b.totalPrice || b.price || 0);
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
        tbody.innerHTML = `<tr><td colspan="4">${emptyStateHtml('📉', 'No booking activity for current listings.')}</td></tr>`;
        return;
    }

    tbody.innerHTML = sorted.map(item => `
        <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.category}</td>
            <td>${item.bookings}</td>
            <td>₹${item.revenue.toLocaleString('en-IN')}</td>
        </tr>
    `).join('');
}

// ─── 17. CATEGORY DISTRIBUTION (storage.js) ─────────────────

function renderCategoryDistribution() {
    const container = document.getElementById('categoryAnalyticsBody');
    if (!container) return;
    const listings = getListings();

    if (listings.length === 0) {
        container.innerHTML = emptyStateHtml('🏷️', 'No categories available yet.');
        return;
    }

    const categories = {};
    listings.forEach(l => {
        const cat = l.category || 'Uncategorized';
        categories[cat] = (categories[cat] || 0) + 1;
    });

    const total      = listings.length;
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

// ─── 18. LISTING MANAGEMENT TABLE (storage.js) ───────────────

function renderListingManagement() {
    const tbody = document.getElementById('analyticsListingMgmtBody');
    if (!tbody) return;

    const listings = getListings();
    if (listings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#9ca3af;">No listings found.</td></tr>`;
        return;
    }

    tbody.innerHTML = listings.map(listing => {
        const title      = listing.title || listing.name || 'Unknown';
        const price      = listing.price || listing.basePrice || 0;
        const status     = listing.status || 'Unknown';
        const sellerName = listing.seller?.name || '—';
        const isBlocked  = status.toLowerCase() === 'blocked';

        let badgeClass = 'badge-normal';
        if (status === 'Active')                            badgeClass = 'badge-low';
        if (status === 'Blocked')                           badgeClass = 'badge-blocked';
        if (status === 'Inactive' || status === 'Pending')  badgeClass = 'badge-orange';

        const blockBtn = isBlocked
            ? `<button class="action-btn" onclick="openUnblockModal('${listing.id}')">Unblock</button>`
            : `<button class="action-btn btn-block-text" onclick="openBlockModal('${listing.id}')">Block</button>`;

        return `
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
    }).join('');
}

// ─── 19. BLOCKED LISTINGS (storage.js) ──────────────────────

function renderBlockedListings() {
    const container = document.getElementById('blockedListingsContainer');
    if (!container) return;

    const blocked = getListings().filter(l => (l.status || '').toLowerCase() === 'blocked');

    if (blocked.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="padding:32px; text-align:center; color:var(--text-secondary);">
                <div style="font-size:32px; opacity:0.4; margin-bottom:12px;">✅</div>
                <p style="font-size:15px;">No blocked listings at the moment.</p>
            </div>
        `;
        return;
    }

    let html = `<div class="glass-card table-card"><div class="table-responsive"><table class="platform-table">
        <thead><tr>
            <th>Listing</th><th>Category</th><th>Seller / Host</th>
            <th>Price</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>`;

    blocked.forEach(listing => {
        const title      = listing.title || listing.name || 'Unknown';
        const price      = listing.price || listing.basePrice || 0;
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

// ─── 20. PREMIUM USERS TABLE (storage.js) ───────────────────

function renderPremiumUsersAnalytics() {
    const tbody = document.getElementById('analyticsPremiumBody');
    if (!tbody) return;

    const premiumUsers = getPremiumUsers(getUsers());

    if (premiumUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#9ca3af;">No premium users found.</td></tr>`;
        return;
    }

    tbody.innerHTML = premiumUsers.map(u => {
        const expiryDate = u.premiumExpiryDate
            ? new Date(u.premiumExpiryDate).toLocaleDateString('en-IN')
            : '—';
        return `
            <tr>
                <td><strong>${u.username || 'Unknown'}</strong></td>
                <td>${u.useremail || '—'}</td>
                <td><span class="badge badge-low">Premium Active</span></td>
                <td>${expiryDate}</td>
                <td><button class="action-btn" onclick="openPremiumDetailModal('${u.useremail}')">View Details</button></td>
            </tr>
        `;
    }).join('');
}

// ─── 21. BLOCK / UNBLOCK ACTIONS & MODALS ───────────────────

function openBlockModal(id) {
    _pendingBlockId = id;
    const modal = document.getElementById('blockListingModal');
    if (modal) modal.classList.add('active');
}
function closeBlockModal() {
    _pendingBlockId = null;
    document.getElementById('blockListingModal')?.classList.remove('active');
}
function confirmBlock() {
    if (!_pendingBlockId) return;
    const allListings = getListings();
    const listing     = allListings.find(l => l.id === _pendingBlockId);
    if (listing) {
        if (listing.status !== 'Blocked') listing.previousStatus = listing.status;
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
    document.getElementById('unblockListingModal')?.classList.add('active');
}
function closeUnblockModal() {
    _pendingUnblockId = null;
    document.getElementById('unblockListingModal')?.classList.remove('active');
}
function confirmUnblock() {
    if (!_pendingUnblockId) return;
    const allListings     = getListings();
    const listing         = allListings.find(l => l.id === _pendingUnblockId);
    const validStatuses   = ['Active', 'Inactive', 'Pending', 'Disabled'];
    if (listing) {
        const prev    = listing.previousStatus;
        listing.status = (prev && prev !== 'Blocked' && validStatuses.includes(prev)) ? prev : 'Active';
        delete listing.previousStatus;
        saveListings(allListings);
        dispatchStorageUpdate(STORAGE_KEYS.LISTINGS);
        refreshAll();
        showToast(`"${listing.title || listing.id}" is now ${listing.status}.`);
    }
    closeUnblockModal();
}

function openListingDetailModal(id) {
    const listing = getListings().find(l => l.id === id);
    if (!listing) return;

    const row = (label, value) => `
        <div class="premium-detail-row">
            <span class="premium-detail-label">${label}</span>
            <span class="premium-detail-value" style="text-align:right;">${value}</span>
        </div>
    `;
    let html = '';
    const imgUrl = listing.images?.[0] || listing.imageUrl;
    if (imgUrl) html += `<div style="text-align:center;margin-bottom:16px;"><img src="${imgUrl}" alt="${listing.title || 'Listing'}" style="max-width:100%;max-height:180px;border-radius:8px;object-fit:cover;"></div>`;
    if (listing.id)                      html += row('Listing ID', listing.id);
    const title = listing.title || listing.name;
    if (title)                           html += row('Title', title);
    if (listing.category)                html += row('Category', listing.category);
    if (listing.description || listing.desc) html += row('Description', listing.description || listing.desc);
    const price = listing.price || listing.basePrice;
    if (price !== undefined && price !== null) {
        html += row('Price', `₹${Number(price).toLocaleString('en-IN')}${listing.period ? ' / ' + listing.period : ''}`);
    }
    const location = listing.location || listing.city || listing.seller?.city;
    if (location) html += row('Location', location);
    const sellerName = typeof listing.seller === 'object' ? listing.seller?.name : listing.seller;
    if (sellerName) html += row('Seller', sellerName);
    if (listing.status) {
        let bc = 'badge-normal';
        if (listing.status === 'Active')   bc = 'badge-low';
        if (listing.status === 'Blocked')  bc = 'badge-blocked';
        if (listing.status === 'Inactive' || listing.status === 'Pending') bc = 'badge-orange';
        html += row('Status', `<span class="badge ${bc}">${listing.status.toUpperCase()}</span>`);
    }

    const content = document.getElementById('listingDetailContent');
    if (content) content.innerHTML = html;
    document.getElementById('listingDetailModal')?.classList.add('active');
}
function closeListingDetailModal() {
    document.getElementById('listingDetailModal')?.classList.remove('active');
}

function openPremiumDetailModal(email) {
    const allUsers  = getUsers();
    const user      = allUsers.find(u => u.useremail === email);
    if (!user) return;

    const allBookings  = getBookings();
    const userBookings = allBookings.filter(b =>
        b.renterEmail === user.useremail || b.renterName === user.username
    );
    const totalSpent   = userBookings.reduce((sum, b) => {
        const status = (b.status || '').toLowerCase();
        return (status === 'confirmed' || status === 'completed')
            ? sum + parseFloat(b.grandTotal || b.amount || 0) : sum;
    }, 0);

    const row = (label, value) => `
        <div class="premium-detail-row">
            <span class="premium-detail-label">${label}</span>
            <span class="premium-detail-value">${value}</span>
        </div>
    `;
    let html = '';
    html += row('Name',         user.username || '—');
    html += row('Email',        user.useremail || '—');
    if (user.userphone) html += row('Phone', user.userphone);
    html += row('Role',         user.role ? capitalize(user.role) : '—');
    html += row('Membership',   '<span class="badge badge-low">Premium Active</span>');
    const purchaseDate = user.premiumPurchaseDate ? new Date(user.premiumPurchaseDate).toLocaleDateString('en-IN') : null;
    if (purchaseDate)   html += row('Premium Since',  purchaseDate);
    html += row('Premium Expires', user.premiumExpiryDate ? new Date(user.premiumExpiryDate).toLocaleDateString('en-IN') : '—');
    const regDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : null;
    if (regDate)        html += row('Registered', regDate);
    html += row('Total Bookings', userBookings.length);
    html += row('Total Spent',   `₹${totalSpent.toLocaleString('en-IN')}`);

    const content = document.getElementById('premiumDetailContent');
    if (content) content.innerHTML = html;
    document.getElementById('premiumDetailModal')?.classList.add('active');
}
function closePremiumDetailModal() {
    document.getElementById('premiumDetailModal')?.classList.remove('active');
}

// ─── 22. TOAST ──────────────────────────────────────────────

function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className   = 'toast-message';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (container.contains(toast)) container.removeChild(toast); }, 300);
    }, 3000);
}

// ─── 23. MOBILE MENU ────────────────────────────────────────

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
    links.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    if (navbar) {
        const syncScrolled = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
        syncScrolled();
        window.addEventListener('scroll', syncScrolled, { passive: true });
    }
}

// ─── MODAL WIRING ────────────────────────────────────────────

function attachModalListeners() {
    document.getElementById('cancelBlockBtn')    ?.addEventListener('click', closeBlockModal);
    document.getElementById('confirmBlockBtn')   ?.addEventListener('click', confirmBlock);
    document.getElementById('cancelUnblockBtn')  ?.addEventListener('click', closeUnblockModal);
    document.getElementById('confirmUnblockBtn') ?.addEventListener('click', confirmUnblock);
    document.getElementById('closePremiumDetailBtn')?.addEventListener('click', closePremiumDetailModal);
    document.getElementById('closeListingDetailBtn')?.addEventListener('click', closeListingDetailModal);

    ['blockListingModal', 'unblockListingModal', 'premiumDetailModal', 'listingDetailModal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.addEventListener('click', e => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    _pendingBlockId = null;
                    _pendingUnblockId = null;
                }
            });
        }
    });
}

// ─── 24. DESTROY A CHART SAFELY ─────────────────────────────

function destroyChart(key) {
    if (charts[key]) {
        charts[key].destroy();
        charts[key] = null;
    }
}

function destroyAllCharts() {
    Object.keys(charts).forEach(key => destroyChart(key));
}

// ─── REFRESH BUTTON SPIN STATE ───────────────────────────────

function setRefreshSpinning(spinning) {
    const icon = document.getElementById('refreshIcon');
    const btn  = document.getElementById('refreshBtn');
    if (icon) icon.classList.toggle('spinning', spinning);
    if (btn)  btn.disabled = spinning;
}

// ─── 25. REFRESH ALL (main orchestrator) ─────────────────────

async function refreshAll() {
    setRefreshSpinning(true);

    // Attempt to fetch backend analytics
    let fetchError = null;
    try {
        if (window.RentFlowAPI && window.RentFlowAPI.isLoggedIn()) {
            const res = await window.RentFlowAPI.get('/admin/analytics/overview');
            if (res && res.data) {
                backendAnalytics = res.data;
            }
        }
    } catch (err) {
        console.error('Analytics API error:', err);
        fetchError = err;
    }

    // Destroy old Chart.js instances before redrawing
    destroyAllCharts();

    // Render all sections
    renderKPIs();
    renderRoleChart();
    renderKycChart();
    renderProChart();
    renderRegistrationTrend();
    renderRatingChart();
    renderRatingDonutChart();
    renderFeedbackTrendChart();
    renderSummary();

    // Storage.js sections (teammate data — always render)
    renderBookingAnalytics();
    renderRevenueAnalytics();
    renderListingPerformance();
    renderCategoryDistribution();
    renderListingManagement();
    renderBlockedListings();
    renderPremiumUsersAnalytics();

    updateLastUpdated();
    setRefreshSpinning(false);

    // If we had a fetch error AND no backend analytics, show error overlay
    // (but keep the page usable for the storage.js sections)
    if (fetchError && !backendAnalytics) {
        showError('Unable to load live analytics from the backend. Showing local data only.');
        showContent(); // Still show content section
    } else {
        showContent();
    }
}

// ─── UTILITIES ──────────────────────────────────────────────

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDateLabel(rawDate) {
    if (!rawDate) return '';
    // rawDate might be "2024-03-15" or "2024-03" — keep as-is, just clean up
    return String(rawDate).trim();
}

function emptyStateHtml(icon, text) {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <div class="empty-state-text">${text}</div>
        </div>
    `;
}

// ─── DOMContentLoaded INIT ───────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Security: check admin status (legacy + JWT paths)
    const isLoggedIn       = localStorage.getItem('isLoggedIn');
    const currentUserRaw   = localStorage.getItem('current_user');
    const hasToken         = !!localStorage.getItem('rf_token');
    let   isAdmin          = false;

    if (hasToken) {
        // JWT users: treated as potentially admin (server middleware will verify)
        isAdmin = true;
    } else if (isLoggedIn === 'true' && currentUserRaw) {
        try {
            const currentUser = JSON.parse(currentUserRaw);
            if (currentUser.useremail === 'admin@rentflow.com' || currentUser.role === 'admin') {
                isAdmin = true;
            }
        } catch (e) {
            console.error('Error parsing current_user:', e);
        }
    }

    if (!isAdmin) {
        window.location.href = 'login.html';
        return;
    }

    // Apply Chart.js global defaults
    applyChartDefaults();

    // Show loading, then load data
    showLoading();
    refreshAll();

    // Wire up refresh button
    document.getElementById('refreshBtn') ?.addEventListener('click', refreshAll);
    document.getElementById('retryBtn')   ?.addEventListener('click', () => { showLoading(); refreshAll(); });

    initMobileMenu();
    attachModalListeners();

    // Cross-tab storage changes
    window.addEventListener('storage', (e) => {
        if ([STORAGE_KEYS.USERS, STORAGE_KEYS.LISTINGS, STORAGE_KEYS.BOOKINGS, STORAGE_KEYS.FEEDBACK].includes(e.key)) {
            refreshAll();
        }
    });

    // Same-tab updates dispatched by dispatchStorageUpdate()
    window.addEventListener('rentiq_storage_update', () => { refreshAll(); });
});
