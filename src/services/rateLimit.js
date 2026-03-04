/**
 * Rate limiting utility for API calls
 */

import { sleep } from './retry.js';
import logger from '../utils/logger.js';

export class RateLimiter {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 10;
    this.batchDelay = options.batchDelay || 200; // ms
    this.maxConcurrent = options.maxConcurrent || 3;
    this.queue = [];
    this.running = 0;
  }

  /**
   * Process items in batches with rate limiting
   * @param {Array} items - Items to process
   * @param {Function} processFn - Async function to process each item
   * @returns {Promise<Array>} - Results array
   */
  async processBatch(items, processFn) {
    const results = [];
    const batches = this._createBatches(items);

    logger.info(`Processing ${items.length} items in ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.debug(
        `Processing batch ${i + 1}/${batches.length} (${batch.length} items)`
      );

      // Process batch with concurrency limit
      const batchResults = await this._processConcurrent(batch, processFn);
      results.push(...batchResults);

      // Delay before next batch (except for last batch)
      if (i < batches.length - 1) {
        logger.debug(`Waiting ${this.batchDelay}ms before next batch`);
        await sleep(this.batchDelay);
      }
    }

    return results;
  }

  /**
   * Process items concurrently with max concurrency limit
   */
  async _processConcurrent(items, processFn) {
    const results = [];
    const chunks = this._createChunks(items, this.maxConcurrent);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item) => {
        try {
          this.running++;
          const result = await processFn(item);
          this.running--;
          return { success: true, result, item };
        } catch (error) {
          this.running--;
          return { success: false, error, item };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Create batches from items array
   */
  _createBatches(items) {
    const batches = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    return batches;
  }

  /**
   * Create chunks for concurrent processing
   */
  _createChunks(items, chunkSize) {
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      running: this.running,
      batchSize: this.batchSize,
      batchDelay: this.batchDelay,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

export default RateLimiter;
