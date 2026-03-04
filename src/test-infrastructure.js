/**
 * Test script for Phase 1 infrastructure
 * Tests rate limiting, retry logic, logging, and validation
 */

import logger from './utils/logger.js';
import validator from './utils/validator.js';
import RateLimiter from './services/rateLimit.js';
import { retryWithBackoff, sleep } from './services/retry.js';

async function testInfrastructure() {
  logger.info('=== Testing Phase 1 Infrastructure ===\n');

  // Test 1: Logger
  logger.info('Test 1: Logger utility');
  logger.debug('This is a debug message');
  logger.info('This is an info message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
  logger.success('Logger test passed!');
  console.log('');

  // Test 2: Validator
  logger.info('Test 2: Validator utility');
  try {
    const testContact = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567',
      address: {
        street: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zip: '02101',
      },
    };
    validator.validateContact(testContact);
    logger.success('Validator test passed!');
  } catch (error) {
    logger.failure('Validator test failed', error.message);
  }
  console.log('');

  // Test 3: Rate Limiter
  logger.info('Test 3: Rate Limiter');
  const rateLimiter = new RateLimiter({
    batchSize: 3,
    batchDelay: 100,
    maxConcurrent: 2,
  });

  const items = Array.from({ length: 10 }, (_, i) => i + 1);
  const processFn = async (item) => {
    await sleep(50);
    return item * 2;
  };

  const startTime = Date.now();
  const results = await rateLimiter.processBatch(items, processFn);
  const duration = Date.now() - startTime;

  logger.success(
    `Rate limiter processed ${results.length} items in ${duration}ms`
  );
  console.log('');

  // Test 4: Retry Logic
  logger.info('Test 4: Retry logic');
  let attemptCount = 0;
  const flakyFunction = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('Simulated failure');
    }
    return 'Success!';
  };

  try {
    const result = await retryWithBackoff(flakyFunction, {
      maxRetries: 3,
      baseDelay: 100,
    });
    logger.success(`Retry logic succeeded after ${attemptCount} attempts: ${result}`);
  } catch (error) {
    logger.failure('Retry logic failed', error.message);
  }
  console.log('');

  logger.success('=== All infrastructure tests passed! ===');
}

// Run tests
testInfrastructure().catch((error) => {
  logger.error('Infrastructure test failed', error);
  process.exit(1);
});
