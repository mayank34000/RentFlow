const jwt = require('jsonwebtoken');

// Verifies the JWT from the Authorization header
// Expected format:
// Authorization: Bearer <token>

function auth(req, res, next) {
  if (!process.env.JWT_SECRET) {
    console.error('[Auth Middleware] FATAL: JWT_SECRET is not configured on the server.');
    return res.status(500).json({
      success: false,
      message: 'Server authentication configuration error.'
    });
  }
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided. Please log in.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId = decoded.userId || decoded.id || decoded._id;
    req.user = {
      ...decoded,
      id: userId,
      _id: userId,
      role: (decoded.role === 'customer' || decoded.role === 'seller') ? 'user' : decoded.role,
    };

    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.'
    });
  }
}

module.exports = auth;