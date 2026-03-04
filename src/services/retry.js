/**
 * Retry logic with exponential backoff
 */

import logger from '../utils/logger.js';

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the function
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 5,
    baseDelay = 1000, // 1 second
    maxDelay = 16000, // 16 seconds
    shouldRetry = () => true,
    onRetry = () => {},
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      logger.warn(
        `Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms`,
        { error: error.message }
      );

      onRetry(attempt, error, delay);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries exhausted
  logger.error(`All ${maxRetries + 1} attempts failed`, {
    error: lastError.message,
  });
  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (rate limit or network error)
 */
export function isRetryableError(error) {
  // Rate limit errors
  if (error.response?.status === 429) {
    return true;
  }

  // Server errors (5xx)
  if (error.response?.status >= 500) {
    return true;
  }

  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Request timeout
  if (error.code === 'ECONNABORTED') {
    return true;
  }

  return false;
}

export default {
  retryWithBackoff,
  sleep,
  isRetryableError,
};
