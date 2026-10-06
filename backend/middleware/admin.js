// Admin role-check middleware.
// Must be used AFTER the auth middleware — it relies on req.user being set.
//
// Usage in a route file:
//   const auth  = require('../middleware/auth');
//   const admin = require('../middleware/admin');
//
//   router.get('/some-admin-route', auth, admin, handler);
//
// The role is read exclusively from the JWT payload (req.user.role).
// It is NEVER taken from req.body, query params, or request headers.

function admin(req, res, next) {
  // Safety check: if auth middleware didn't run or failed silently, reject here.
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
  }

  next();
}

module.exports = admin;
