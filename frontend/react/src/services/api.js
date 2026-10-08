/**
 * RentFlow - Shared API Utilities
 *
 * Centralizes the API base URL and authentication headers
 * so that every page uses the same API request mechanism.
 */

export const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Returns authentication headers using the canonical JWT based authentication.
 */
export function getAuthHeaders() {
    const headers = {};
    const token = localStorage.getItem('token');
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

// JWT/session utilities.
export function isLoggedIn() {
    return !!localStorage.getItem('token');
}

export function getAuthUser() {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

export function saveAuthSession(token, user) {
    localStorage.setItem('token', token);
    if (user) {
        localStorage.setItem('user', JSON.stringify(user));
    }
}

export function clearAuthSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
// REAL LISTING API
// ==========================================

export function adaptListing(listing) {
    if (!listing) return listing;
    
    // Map id to _id for older components that might rely on id
    const adapted = {
        ...listing,
        id: listing._id,
        // Map backend's owner structure to what the frontend's mock used to be (seller) if needed for backwards compatibility in UI
        seller: listing.owner ? {
            name: listing.owner.name || 'Owner',
            phone: listing.owner.phone || '',
            city: listing.city || listing.owner.city || 'Unknown',
            address: listing.city || listing.owner.city || 'Unknown'
        } : null
    };

    if (adapted.image && adapted.image.startsWith('/uploads')) {
        adapted.image = `${API_URL}${adapted.image}`;
    }

    return adapted;
}

export async function getListings(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value) queryParams.append(key, value);
        });
        
        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const { data } = await apiRequest(`/api/listings${queryString}`);
        // Unwraps { success, count, data } to just data
        const rawListings = data.data || [];
        return rawListings.map(adaptListing);
    } catch (err) {
        console.error("Error fetching listings:", err);
        return [];
    }
}

export async function saveListing(formData) {
    const { data } = await apiRequest('/api/listings', {
        method: 'POST',
        body: formData
    });
    return adaptListing(data.data);
}

export async function updateListing(id, formData) {
    const { data } = await apiRequest(`/api/listings/${id}`, {
        method: 'PUT',
        body: formData
    });
    return adaptListing(data.data);
}

export async function deleteListing(id) {
    await apiRequest(`/api/listings/${id}`, {
        method: 'DELETE'
    });
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

// ==========================================
// PAYMENT API
// ==========================================

export async function createPaymentOrder() {
    const { data } = await apiRequest('/api/payment/create-order', {
        method: 'POST'
    });
    return data;
}

export async function verifyPayment(paymentData) {
    const { data } = await apiRequest('/api/payment/verify', {
        method: 'POST',
        body: paymentData
    });
    return data;
}
