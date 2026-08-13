/**
 * SHADA1st Apparel Shop — Rate Limiting & Security Throttler
 * Prevents brute-force PIN attacks and rapid form submission spamming.
 */

const attemptStore = new Map();

/**
 * Checks and records an action attempt.
 * @param {string} key - Unique identifier (e.g. 'admin_pin_login')
 * @param {number} maxAttempts - Maximum allowed attempts
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remainingMs: number }}
 */
export function checkRateLimit(key, maxAttempts = 5, windowMs = 180000) {
  const now = Date.now();
  const record = attemptStore.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  if (record.count >= maxAttempts) {
    const remainingMs = record.resetTime - now;
    return { allowed: false, remainingMs };
  }

  record.count += 1;
  attemptStore.set(key, record);
  return { allowed: true, remainingMs: 0 };
}

/**
 * Resets rate limit counter for a specific key (e.g. on successful login)
 * @param {string} key 
 */
export function resetRateLimit(key) {
  attemptStore.delete(key);
}
