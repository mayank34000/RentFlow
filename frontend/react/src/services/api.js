/**
 * RentFlow — Shared API Utilities
 *
 * Centralizes the API base URL and JWT authentication
 * so that every page uses the same authentication mechanism.
 */

export const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Returns the JWT authentication headers.
 *
 * The JWT is stored in localStorage after successful login.
 *
 * @returns {Record<string, string>} Headers object.
 */
export function getAuthHeaders() {
    const headers = {};

    // Development authentication
    const devUserId = localStorage.getItem('devUserId');
    if (devUserId) {
        headers['x-dev-user-id'] = devUserId;
    }

    // JWT authentication
    const token = localStorage.getItem('rf_token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}


/**
 * Generic API request helper.
 *
 * - Attaches JSON content-type for requests with a body.
 * - Attaches JWT authentication headers via getAuthHeaders().
 * - Parses JSON responses.
 * - Attaches `status` to thrown errors so callers
 *   can distinguish 401 / 404 / 500 etc.
 * - Handles non-JSON responses gracefully.
 *
 * @param {string} endpoint — path relative to API_URL,
 *   e.g. '/api/bookings/my'
 * @param {object} [options] — fetch options override
 *   (method, body, signal, …)
 * @returns {Promise<{ status: number, data: any }>}
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

    // Try to parse JSON; fall back to null for non-JSON responses.
    let data = null;

    try {
        data = await response.json();
    } catch {
        // Non-JSON response (HTML error page, empty body, etc.).
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