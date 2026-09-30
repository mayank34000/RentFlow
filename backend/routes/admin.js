const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// GET /api/admin/test
// Protected by auth + admin middleware.
// Used to verify the middleware chain works correctly.
// Will be removed or replaced by real admin routes in the next part.
router.get('/test', auth, admin, (req, res) => {
  res.json({
    success: true,
    message: 'Admin access confirmed.',
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
});

module.exports = router;
