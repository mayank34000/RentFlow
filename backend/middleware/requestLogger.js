'use strict';

/**
 * RentFlow — HTTP Request Logger Middleware
 * Owner: Mayank
 *
 * Uses Node.js built-ins only:
 *   - events  (EventEmitter) — decouples log writing from the request cycle
 *   - fs      (createWriteStream / mkdirSync / existsSync) — persists logs to disk
 *   - path    (join, resolve) — platform-safe file paths
 *
 * What is logged:
 *   timestamp, method, path, query string, status code, response time (ms)
 *
 * What is NEVER logged (security):
 *   - Authorization headers
 *   - Request bodies (may contain passwords)
 *   - JWT tokens
 *   - Any header containing "secret", "key", "token", or "password"
 *
 * Integration: mount as the FIRST middleware in server.js so every
 * request is captured before any route handler runs.
 *
 * Usage in server.js:
 *   const requestLogger = require('./middleware/requestLogger');
 *   app.use(requestLogger);
 */

const EventEmitter = require('events');
const fs           = require('fs');
const path         = require('path');

// ── Log directory and file setup ──────────────────────────────────────────────

// Resolve the log directory relative to this file's location so it works
// regardless of which directory the server is started from.
const LOG_DIR  = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'requests.log');

let logStream = null;

try {
  // Create the logs/ directory if it does not already exist.
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  // Append-mode write stream — survives server restarts without truncating the log.
  logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  logStream.on('error', (err) => {
    console.error('[RequestLogger] Stream error:', err.message);
  });
} catch (err) {
  // Handle serverless / read-only filesystems gracefully without throwing
  console.warn('[RequestLogger] File logging disabled (read-only filesystem or restricted permissions):', err.message);
}

// ── EventEmitter — decouples log writing from the request cycle ───────────────

class RequestLogger extends EventEmitter {}

const logger = new RequestLogger();

// The 'request-completed' listener receives a pre-formatted log line and
// writes it to disk via the stream. Running it asynchronously (via emit)
// means the HTTP response is sent before fs I/O completes.
logger.on('request-completed', (logLine) => {
  if (logStream && logStream.writable) {
    logStream.write(logLine + '\n', (err) => {
      if (err) {
        // fs write errors should not crash the server — print to stderr only.
        console.error('[RequestLogger] Failed to write log entry:', err.message);
      }
    });
  }
});

// ── Middleware factory ─────────────────────────────────────────────────────────

/**
 * Express middleware that times each request and emits a 'request-completed'
 * event after the response is sent. The event listener writes the entry to
 * the log file asynchronously, so this does not block the response.
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Hook into the response 'finish' event (fires after headers + body are flushed).
  res.on('finish', () => {
    const durationMs  = Date.now() - startTime;
    const timestamp   = new Date().toISOString();
    const method      = req.method;
    const urlPath     = req.path || req.url;
    const query       = req.query && Object.keys(req.query).length > 0
      ? '?' + new URLSearchParams(req.query).toString()
      : '';
    const status      = res.statusCode;

    // Format: [ISO-TIMESTAMP] METHOD /path?query STATUS Xms
    const logLine = `[${timestamp}] ${method.padEnd(6)} ${urlPath}${query} ${status} ${durationMs}ms`;

    // Emit to the EventEmitter listener — I/O happens off the request path.
    logger.emit('request-completed', logLine);

    // Mirror to stdout so Vercel / serverless runtime logs capture it natively
    if (process.env.NODE_ENV === 'production') {
      console.log(`[HTTP] ${logLine}`);
    } else {
      const colour = status >= 500 ? '\x1b[31m'  // red
                   : status >= 400 ? '\x1b[33m'  // yellow
                   : status >= 300 ? '\x1b[36m'  // cyan
                   : '\x1b[32m';                  // green
      console.log(`${colour}[HTTP] ${logLine}\x1b[0m`);
    }
  });

  next();
}

module.exports = requestLogger;
