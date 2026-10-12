// Central error-handling middleware.
// Must be registered LAST in server.js: app.use(errorHandler)
// Express recognizes it as an error handler because it has 4 parameters.

function errorHandler(err, req, res, next) {
  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ') || 'Validation error'
    });
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'File size too large. Maximum allowed size is 5MB.'
        : `File upload error: ${err.message}`
    });
  }

  if (err.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: 'Please upload a valid image file (JPEG, PNG, or WebP).'
    });
  }

  // Use the status code attached to the error, or default to 500
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
