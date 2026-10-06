// Central error-handling middleware.
// Must be registered LAST in server.js: app.use(errorHandler)
// Express recognizes it as an error handler because it has 4 parameters.

function errorHandler(err, req, res, next) {
  // Use the status code attached to the error, or default to 500
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
