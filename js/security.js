/**
 * SHADA1st Apparel Shop — Security & Input Sanitation Engine
 * Treats all user input strictly as plain data, preventing XSS and injection attacks.
 */

/**
 * Escapes special characters to HTML entities so browser treats text strictly as DATA, not code.
 * @param {string} str - Raw input string
 * @returns {string} Safe HTML-encoded string
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Cleans and trims user text input safely.
 * @param {string} str 
 * @returns {string} Sanitized string
 */
export function sanitizeInput(str) {
  if (!str) return '';
  return escapeHTML(String(str).trim());
}
