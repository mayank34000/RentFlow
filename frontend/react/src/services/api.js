/**
 * RentFlow - Shared API Utilities
 *
 * Centralizes the API base URL and authentication headers
 * so that every page uses the same API request mechanism.
 */

export const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Returns authentication headers for both the existing development
 * user flow and JWT-based authentication.
 */
export function getAuthHeaders() {
    const headers = {};
    // Aryan's development user authentication.
    const devUserId = localStorage.getItem('devUserId');
    if (devUserId) {
        headers['x-dev-user-id'] = devUserId;
    }

    // Mayank's existing admin/session JWT.
    // Fall back to Dhruv's generic "token" key for newer auth pages.
    const rfToken = localStorage.getItem('rf_token');
    const token = rfToken || localStorage.getItem('token');

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

// JWT/session utilities.
export function isLoggedIn() {
    return !!(
        localStorage.getItem('rf_token') ||
        localStorage.getItem('token')
    );
}

export function getAuthUser() {
    try {
        const user = localStorage.getItem('rf_user');
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

export function saveAuthSession(token, user) {
    localStorage.setItem('rf_token', token);
    localStorage.setItem('token', token);

    if (user) {
        localStorage.setItem('rf_user', JSON.stringify(user));
    }
}

export function clearAuthSession() {
    localStorage.removeItem('rf_token');
    localStorage.removeItem('token');
    localStorage.removeItem('rf_user');
}

/**
 * Generic API request helper.
 *
 * - Attaches JSON content-type for requests with a body.
 * - Attaches authentication headers.
 * - Parses JSON responses.
 * - Attaches status/data to thrown errors.
 * - Handles non-JSON responses gracefully.
 */
export async function apiRequest(endpoint, options = {}) {
    const {
        body,
        headers: extraHeaders,
        ...rest
    } = options;

    const headers = {
        ...getAuthHeaders(),
        ...extraHeaders,
    };

    if (
        body &&
        typeof body === 'object' &&
        !(body instanceof FormData)
    ) {
        headers['Content-Type'] = 'application/json';
    }

    const fetchOptions = {
        ...rest,
        headers,
        body:
            body &&
            typeof body === 'object' &&
            !(body instanceof FormData)
                ? JSON.stringify(body)
                : body,
    };

    const response = await fetch(
        `${API_URL}${endpoint}`,
        fetchOptions
    );

    let data = null;

    try {
        data = await response.json();
    } catch {
        // Non-JSON response.
    }

    if (!response.ok) {
        const err = new Error(
            (data && data.message) ||
            `Request failed with status ${response.status}`
        );

        err.status = response.status;
        err.data = data;

        throw err;
    }

    return {
        status: response.status,
        data,
    };
}

// ==========================================
// MOCK LISTING API (Fallback until backend is ready)
// ==========================================

export function getListings() {
    try {
        return JSON.parse(localStorage.getItem('rentflow_listings')) || [];
    } catch {
        return [];
    }
}

export function saveListing(listing) {
    const listings = getListings();
    listings.push(listing);
    localStorage.setItem('rentflow_listings', JSON.stringify(listings));
    window.dispatchEvent(new Event('storage')); // Notify other tabs/components
    return listing;
}

export function updateListing(id, updates) {
    const listings = getListings();
    const index = listings.findIndex(l => l.id === id);
    if (index !== -1) {
        listings[index] = { ...listings[index], ...updates };
        localStorage.setItem('rentflow_listings', JSON.stringify(listings));
        window.dispatchEvent(new Event('storage'));
        return listings[index];
    }
    throw new Error('Listing not found');
}

export function deleteListing(id) {
    const listings = getListings();
    const newListings = listings.filter(l => l.id !== id);
    localStorage.setItem('rentflow_listings', JSON.stringify(newListings));
    window.dispatchEvent(new Event('storage'));
}

export function getBookings() {
    try {
        return JSON.parse(localStorage.getItem('rentflow_bookings')) || [];
    } catch {
        return [];
    }
}

export function updateBookingStatus(bookingId, status) {
    const bookings = getBookings();
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
        bookings[index].status = status;
        localStorage.setItem('rentflow_bookings', JSON.stringify(bookings));
        window.dispatchEvent(new Event('storage'));
        return bookings[index];
    }
    throw new Error('Booking not found');
}

export function processWalletSettlement(booking) {
    const securityAmount = Math.round(booking.subtotal * 0.10);
    const rentAmount = booking.subtotal;
    const commission = Math.round(rentAmount * 0.02);
    const sellerEarnings = rentAmount - commission;
    const buyerEmail = booking.renterEmail || 'aryanharit14@gmail.com';
    const sellerEmail = booking.lenderEmail || 'madhvtaneja@gmail.com';

    const addTx = (email, type, amount, desc) => {
        const txs = JSON.parse(localStorage.getItem(`wallet_tx_${email}`)) || [];
        txs.push({
            type,
            amount,
            desc,
            date: new Date().toLocaleDateString('en-IN')
        });
        localStorage.setItem(`wallet_tx_${email}`, JSON.stringify(txs));
    };

    addTx(buyerEmail, 'Credit', securityAmount, `Refund: Security Deposit (${booking.itemTitle})`);
    addTx(sellerEmail, 'Credit', sellerEarnings, `Rent Earning: ${booking.itemTitle} (2% commission cut)`);
    
    updateBookingStatus(booking.id, 'Returned');
    
    return { securityAmount, sellerEarnings, commission, buyerEmail, sellerEmail };
}
