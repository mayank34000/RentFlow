/**
 * RentFlow — Shared API Utilities
 *
 * Centralizes the API base URL and dev-authentication header logic
 * so that every page (booking, booking-history, etc.) uses the same
 * mechanism without duplicating VITE_API_URL or header construction.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Returns the development authentication headers used by the backend
 * devAuth middleware.  The source of truth is localStorage.devUserId.
 *
 * @returns {Record<string, string>} Headers object.
 */
export function getAuthHeaders() {
    const devUserId = localStorage.getItem('devUserId');
    if (!devUserId) return {};
    return { 'x-dev-user-id': devUserId };
}


/**
 * Generic API request helper.
 *
 * - Attaches JSON content-type for requests with a body.
 * - Attaches dev-auth headers via getAuthHeaders().
 * - Parses JSON responses; attaches `status` to thrown errors
 *   so callers can distinguish 401 / 404 / 500 etc.
 * - Handles non-JSON responses gracefully.
 *
 * @param {string}  endpoint  — path relative to API_URL, e.g. '/api/bookings/my'
 * @param {object}  [options] — fetch options override (method, body, signal, …)
 * @returns {Promise<{ status: number, data: any }>}
 */
export async function apiRequest(endpoint, options = {}) {
    const { body, headers: extraHeaders, ...rest } = options;

    const headers = {
        ...getAuthHeaders(),
        ...extraHeaders,
    };

    if (body && typeof body === 'object' && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const fetchOptions = {
        ...rest,
        headers,
        body: body && typeof body === 'object' && !(body instanceof FormData)
            ? JSON.stringify(body)
            : body,
    };

    const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);

    // Try to parse JSON; fall back to null for non-JSON responses
    let data = null;
    try {
        data = await response.json();
    } catch {
        // non-JSON response (HTML error page, empty body, etc.)
    }

    if (!response.ok) {
        const err = new Error(
            (data && data.message) || `Request failed with status ${response.status}`
        );
        err.status = response.status;
        err.data = data;
        throw err;
    }

    return { status: response.status, data };
}
