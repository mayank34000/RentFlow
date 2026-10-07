export function adminApiErrorMessage(error, action = 'complete the request') {
  if (!error?.status) {
    return 'Could not reach the RentFlow backend. Check that the server is running and try again.';
  }

  if (error.status === 401) {
    return 'Authentication required. Please sign in again to continue.';
  }
  if (error.status === 403) {
    return 'Access denied. This action requires an admin account.';
  }

  if (error.message) return error.message;
  if (error.status === 503) return 'This data source is temporarily unavailable.';
  if (error.status >= 500) return `The server could not ${action}. Try again shortly.`;
  return `Could not ${action} (HTTP ${error.status}).`;
}
