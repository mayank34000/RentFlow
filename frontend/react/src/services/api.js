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
        const userData = localStorage.getItem('rf_user') || 
                         localStorage.getItem('user') || 
                         localStorage.getItem('current_user');
        return userData ? JSON.parse(userData) : null;
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
// LISTING API
// ==========================================

export async function fetchListings() {
    const res = await apiRequest('/api/listings');
    return res.data?.data || [];
}

export async function fetchMyListings() {
    const res = await apiRequest('/api/listings/my');
    return res.data?.data || [];
}

export async function fetchListing(id) {
    const res = await apiRequest(`/api/listings/${id}`);
    return res.data?.data;
}

export async function createListing(formData) {
    const headers = getAuthHeaders();
    // Do not set Content-Type for FormData, browser sets it with boundary
    const res = await fetch(`${API_URL}/api/listings`, {
        method: 'POST',
        headers,
        body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create listing');
    return data;
}

export async function updateListing(id, updates) {
    const res = await apiRequest(`/api/listings/${id}`, {
        method: 'PUT',
        body: updates
    });
    return res.data;
}

export async function deleteListing(id) {
    await apiRequest(`/api/listings/${id}`, { method: 'DELETE' });
}

export async function upgradePremium() {
    const res = await apiRequest('/api/auth/premium', { method: 'POST' });
    return res.data;
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
