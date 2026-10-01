/* ============================================================
   RentFlow – Frontend API Helper (api.js)
   Replaces direct LocalStorage reads for backend API calls.
   Adds the JWT token to every request automatically.
   Usage: import via <script src="../js/api.js"></script>
   ============================================================ */

const API_BASE = 'http://localhost:5000/api';

/**
 * Makes an authenticated fetch request to the RentFlow backend.
 *
 * @param {string} path    - API path, e.g. '/auth/login'
 * @param {object} options - fetch options (method, body, etc.)
 * @returns {Promise<object>} - parsed JSON response
 * @throws {Error} - throws if the request fails or returns a non-2xx status
 */
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('rf_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Server returned an unexpected response.');
  }

  if (!response.ok) {
    // Use the server's message if available, otherwise a generic one
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

// ─── Convenience wrappers ───────────────────────────────────

function apiGet(path) {
  return apiRequest(path, { method: 'GET' });
}

function apiPost(path, body) {
  return apiRequest(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function apiPut(path, body) {
  return apiRequest(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

function apiDelete(path) {
  return apiRequest(path, { method: 'DELETE' });
}

function apiPatch(path, body) {
  return apiRequest(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ─── Auth helpers ───────────────────────────────────────────

/** Save the JWT and user info returned by /api/auth/login */
function saveAuthSession(token, user) {
  localStorage.setItem('rf_token', token);
  localStorage.setItem('rf_user', JSON.stringify(user));
}

/** Clear the JWT and user info on logout */
function clearAuthSession() {
  localStorage.removeItem('rf_token');
  localStorage.removeItem('rf_user');
}

/** Get the currently logged-in user object (from localStorage) */
function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem('rf_user')) || null;
  } catch {
    return null;
  }
}

/** Check whether a user is currently logged in (has a token) */
function isLoggedIn() {
  return !!localStorage.getItem('rf_token');
}

// Expose as a global so all frontend pages can access it via window.RentFlowAPI
window.RentFlowAPI = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
  saveAuthSession,
  clearAuthSession,
  getAuthUser,
  isLoggedIn,
};
