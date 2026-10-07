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
