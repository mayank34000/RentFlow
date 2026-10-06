const jwt = require('jsonwebtoken');

// Verifies the JWT from the Authorization header and attaches the decoded
// user payload to req.user so that downstream middleware/routes can use it.
//
// Expected header format:
//   Authorization: Bearer <token>

function auth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded contains: { id, role, iat, exp }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
}

module.exports = auth;
