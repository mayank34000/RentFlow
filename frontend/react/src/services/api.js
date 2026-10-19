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

    if (!headers['Content-Type']) {
        if (
            body &&
            typeof body === 'object' &&
            !(body instanceof FormData)
        ) {
            headers['Content-Type'] = 'application/json';
        } else if (
            typeof body === 'string' &&
            (body.trim().startsWith('{') || body.trim().startsWith('['))
        ) {
            headers['Content-Type'] = 'application/json';
        }
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
    
    const id = listing.id || listing._id;
    const mongoId = listing._id || listing.id;

    let image = listing.image;
    if (!image && Array.isArray(listing.images) && listing.images.length > 0) {
        image = listing.images[0];
    }
    if (image && image.startsWith('/uploads')) {
        image = `${API_URL}${image}`;
    }

    let video = listing.video || null;
    if (video && video.startsWith('/uploads')) {
        video = `${API_URL}${video}`;
    }

    const seller = listing.seller ? listing.seller : (listing.owner ? {
        name: listing.owner.name || 'Owner',
        phone: listing.owner.phone || '',
        city: listing.city || listing.owner.city || 'Unknown',
        address: listing.city || listing.owner.city || 'Unknown'
    } : {
        name: 'Verified Owner',
        phone: '',
        city: listing.city || 'Unknown',
        address: listing.city || 'Unknown'
    });

    return {
        ...listing,
        id: id,
        _id: mongoId,
        image: image || '',
        video: video,
        seller: seller
    };
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

export function saveListing(formData, onProgress) {
    if (!onProgress) {
        return apiRequest('/api/listings', {
            method: 'POST',
            body: formData
        }).then(({ data }) => adaptListing(data.data));
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/listings`);

        const headers = getAuthHeaders();
        Object.entries(headers).forEach(([k, v]) => {
            xhr.setRequestHeader(k, v);
        });

        if (xhr.upload && typeof onProgress === 'function') {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onProgress(percent);
                }
            };
        }

        xhr.onload = () => {
            let data = null;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (_e) {
                // Non-JSON response matches apiRequest behavior
            }

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(adaptListing(data?.data));
            } else {
                const err = new Error(
                    (data && data.message) ||
                    `Request failed with status ${xhr.status}`
                );
                err.status = xhr.status;
                err.data = data;
                reject(err);
            }
        };

        xhr.onerror = () => {
            const err = new Error('Network error during upload');
            err.status = 0;
            err.data = null;
            reject(err);
        };

        xhr.ontimeout = () => {
            const err = new Error('Upload request timed out');
            err.status = 408;
            err.data = null;
            reject(err);
        };

        xhr.onabort = () => {
            const err = new Error('Upload aborted');
            err.status = 0;
            err.data = null;
            reject(err);
        };

        xhr.send(formData);
    });
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
// PAYMENT API (PREMIUM & GATEWAY)
// ==========================================

export async function getPremiumQuote() {
    const { data } = await apiRequest('/api/payment/quote');
    return data;
}

export async function payPremiumWithWallet() {
    const { data } = await apiRequest('/api/payment/pay-wallet', {
        method: 'POST'
    });
    return data;
}

export async function createPaymentOrder(options = {}) {
    const { data } = await apiRequest('/api/payment/create-order', {
        method: 'POST',
        body: options
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

// ==========================================
// BOOKING PAYMENT API (PAY AFTER APPROVAL)
// ==========================================

export async function getBookingPaymentQuote(bookingId) {
    const { data } = await apiRequest(`/api/bookings/${bookingId}/payment-quote`);
    return data;
}

export async function payBookingWithWallet(bookingId) {
    const { data } = await apiRequest(`/api/bookings/${bookingId}/pay-wallet`, {
        method: 'POST'
    });
    return data;
}

export async function createBookingPaymentOrder(bookingId, options = {}) {
    const { data } = await apiRequest(`/api/bookings/${bookingId}/pay-razorpay/order`, {
        method: 'POST',
        body: options
    });
    return data;
}

export async function verifyBookingPayment(bookingId, paymentData) {
    const { data } = await apiRequest(`/api/bookings/${bookingId}/pay-razorpay/verify`, {
        method: 'POST',
        body: paymentData
    });
    return data;
}

