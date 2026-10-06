// Simple validation helper.
// Usage: validateFields(req.body, ['name', 'email', 'password'])
// Returns null if all fields are present, or an error message string if any are missing/empty.

function validateFields(body, requiredFields) {
  for (const field of requiredFields) {
    const value = body[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      return `${field} is required`;
    }
  }
  return null; // all fields present
}

module.exports = { validateFields };
