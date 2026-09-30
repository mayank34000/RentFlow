/* ============================================================
   RentFlow – Centralized Storage Helper
   Single source of truth for Users, Listings, Bookings, Feedback
   ============================================================ */

const STORAGE_KEYS = {
    USERS: 'user',
    LISTINGS: 'RentFlow_listings',
    BOOKINGS: 'rentflow_bookings',
    FEEDBACK: 'rentiq_feedback',
    CURRENT_USER: 'current_user'
};

// Initial Seed Data for Phase 1 LocalStorage
const DEFAULT_USERS = [
    { username: 'Admin User', useremail: 'admin@rentflow.com', userphone: '9876543210', userpassword: 'Admin@123', role: 'admin' },
    { username: 'Rahul Sharma', useremail: 'rahul@example.com', userphone: '9876543211', userpassword: 'User@1234', role: 'customer' },
    { username: 'Aman Verma', useremail: 'aman@example.com', userphone: '9876543212', userpassword: 'User@1234', role: 'seller' },
    { username: 'Priya Singh', useremail: 'priya@example.com', userphone: '9876543213', userpassword: 'User@1234', role: 'customer' },
    { username: 'Karan Patel', useremail: 'karan@example.com', userphone: '9876543214', userpassword: 'User@1234', role: 'seller' }
];

const DEFAULT_LISTINGS = [
    { id: 'LST-001', title: 'Sony A7IV', category: 'Camera Gear', price: 1000, status: 'Active', date: '2026-08-01', seller: { name: 'Aman Verma', city: 'Mumbai', phone: '9876543212' } },
    { id: 'LST-002', title: 'BMW 3 Series', category: 'Vehicle', price: 5000, status: 'Active', date: '2026-08-05', seller: { name: 'Karan Patel', city: 'Delhi', phone: '9876543214' } },
    { id: 'LST-003', title: 'Conference Hall', category: 'Venue', price: 8000, status: 'Pending', date: '2026-08-10', seller: { name: 'Aman Verma', city: 'Mumbai', phone: '9876543212' } },
    { id: 'LST-004', title: 'Camping Tent', category: 'Outdoor', price: 500, status: 'Active', date: '2026-08-12', seller: { name: 'Karan Patel', city: 'Delhi', phone: '9876543214' } },
    { id: 'LST-005', title: 'DJI Mavic 3', category: 'Camera Gear', price: 1500, status: 'Inactive', date: '2026-07-20', seller: { name: 'Aman Verma', city: 'Mumbai', phone: '9876543212' } }
];

const DEFAULT_BOOKINGS = [
    { bookingId: 'BK-1021', listingId: 'LST-001', itemTitle: 'Sony A7IV', renterName: 'Rahul Sharma', startDate: '2026-08-15', endDate: '2026-08-18', grandTotal: 3240, status: 'Confirmed', bookedAt: '2026-08-10' },
    { bookingId: 'BK-1022', listingId: 'LST-002', itemTitle: 'BMW 3 Series', renterName: 'Priya Singh', startDate: '2026-08-20', endDate: '2026-08-22', grandTotal: 11500, status: 'Pending', bookedAt: '2026-08-11' },
    { bookingId: 'BK-1023', listingId: 'LST-003', itemTitle: 'Conference Hall', renterName: 'Rahul Sharma', startDate: '2026-09-01', endDate: '2026-09-02', grandTotal: 16000, status: 'Cancelled', bookedAt: '2026-08-08' },
    { bookingId: 'BK-1024', listingId: 'LST-004', itemTitle: 'Camping Tent', renterName: 'Priya Singh', startDate: '2026-08-10', endDate: '2026-08-12', grandTotal: 1500, status: 'Confirmed', bookedAt: '2026-08-09' }
];

const DEFAULT_FEEDBACK = [
    { id: 'FB-001', name: 'Rahul Sharma', email: 'rahul@example.com', type: 'Booking Experience', rating: 5, message: 'The booking process was simple and smooth.', bookingId: 'BK-1021', date: '2026-08-12', status: 'Visible' },
    { id: 'FB-002', name: 'Aman Verma', email: 'aman@example.com', type: 'Listing Experience', rating: 4, message: 'Great vehicle, exactly as described in the listing.', bookingId: '', date: '2026-08-10', status: 'Visible' }
];

// Initialize storage if keys do not exist
function initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LISTINGS)) {
        localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(DEFAULT_LISTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(DEFAULT_BOOKINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FEEDBACK)) {
        localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(DEFAULT_FEEDBACK));
    }
}

// ─── GETTERS ────────────────────────────────────────────────

function getUsers() {
    initStorage();
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
    } catch (e) {
        return [];
    }
}

function getListings() {
    initStorage();
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.LISTINGS)) || [];
    } catch (e) {
        return [];
    }
}

function getBookings() {
    initStorage();
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS)) || [];
    } catch (e) {
        return [];
    }
}

function getFeedback() {
    initStorage();
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACK)) || [];
    } catch (e) {
        return [];
    }
}

function getLoggedInUser() {
    initStorage();
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) || null;
    } catch (e) {
        return null;
    }
}

// ─── SETTERS ────────────────────────────────────────────────

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function saveListings(listings) {
    localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
}

function saveBookings(bookings) {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
}

function saveFeedback(feedbackList) {
    localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(feedbackList));
}

// ─── SHARED CALCULATIONS ────────────────────────────────────

/**
 * Calculates total revenue from confirmed/completed bookings.
 * Shared business rule across Admin Dashboard and Analytics.
 */
function calculateTotalRevenue(bookingsList) {
    const list = bookingsList || getBookings();
    return list.reduce((total, b) => {
        const status = (b.status || '').toLowerCase();
        if (status === 'confirmed' || status === 'completed') {
            const amount = parseFloat(b.grandTotal || b.amount || b.totalPrice || b.price || 0);
            return total + amount;
        }
        return total;
    }, 0);
}

/**
 * Calculates the platform fee revenue based on the active listings.
 * Platform Fee Revenue = SUM(price of ACTIVE listings) * 0.02
 */
function calculatePlatformFeeRevenue(listingsList) {
    const list = listingsList || getListings();
    return list.reduce((total, l) => {
        if ((l.status || '').toLowerCase() === 'active') {
            const price = parseFloat(l.price || l.basePrice || 0);
            return total + (price * 0.02);
        }
        return total;
    }, 0);
}

/**
 * Gets the users who have a valid premium subscription.
 */
function getPremiumUsers(usersList) {
    const list = usersList || getUsers();
    const now = new Date();
    return list.filter(u => {
        if (!u.isPremium || !u.premiumExpiryDate) return false;
        try {
            const expiry = new Date(u.premiumExpiryDate);
            return expiry > now;
        } catch(e) {
            return false;
        }
    });
}

/**
 * Dispatches a storage update to keep same-tab UI synced.
 */
function dispatchStorageUpdate(key) {
    window.dispatchEvent(new CustomEvent('rentiq_storage_update', { detail: { key } }));
}

/**
 * Formats currency values consistently.
 */
function formatCurrency(amount) {
    if (amount >= 100000) {
        return '₹' + (amount / 100000).toFixed(2) + 'L';
    }
    return '₹' + amount.toLocaleString('en-IN');
}

// Execute initial storage check immediately
initStorage();
