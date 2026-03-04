/**
 * Lofty API Client
 *
 * TODO: Update endpoints and schemas once API documentation is available
 */

import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';
import { retryWithBackoff, isRetryableError } from '../services/retry.js';

export class LoftyClient {
  constructor() {
    this.baseUrl = config.lofty.baseUrl;
    this.apiKey = config.lofty.apiKey;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        // TODO: Update authorization header format based on API docs
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: 30000,
    });
  }

  /**
   * Create a contact in Lofty
   * @param {Object} contactData - Contact data
   * @returns {Promise<Object>} - Created contact with ID
   */
  async createContact(contactData) {
    return retryWithBackoff(
      async () => {
        logger.debug('Creating contact in Lofty', { email: contactData.email });

        // TODO: Update endpoint path based on API docs
        const response = await this.client.post('/api/contacts', contactData);

        logger.debug('Contact created successfully', { id: response.data.id });
        return response.data;
      },
      {
        maxRetries: config.population.maxRetries,
        shouldRetry: isRetryableError,
      }
    );
  }

  /**
   * Create a property in Lofty
   * @param {Object} propertyData - Property data
   * @returns {Promise<Object>} - Created property with ID
   */
  async createProperty(propertyData) {
    return retryWithBackoff(
      async () => {
        logger.debug('Creating property in Lofty', {
          contactId: propertyData.contactId,
        });

        // TODO: Update endpoint path based on API docs
        const response = await this.client.post('/api/properties', propertyData);

        logger.debug('Property created successfully', { id: response.data.id });
        return response.data;
      },
      {
        maxRetries: config.population.maxRetries,
        shouldRetry: isRetryableError,
      }
    );
  }

  /**
   * Create a deal in Lofty
   * @param {Object} dealData - Deal data
   * @returns {Promise<Object>} - Created deal with ID
   */
  async createDeal(dealData) {
    return retryWithBackoff(
      async () => {
        logger.debug('Creating deal in Lofty', {
          contactId: dealData.contactId,
          name: dealData.name,
        });

        // TODO: Update endpoint path based on API docs
        const response = await this.client.post('/api/deals', dealData);

        logger.debug('Deal created successfully', { id: response.data.id });
        return response.data;
      },
      {
        maxRetries: config.population.maxRetries,
        shouldRetry: isRetryableError,
      }
    );
  }

  /**
   * Create an activity in Lofty
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} - Created activity with ID
   */
  async createActivity(activityData) {
    return retryWithBackoff(
      async () => {
        logger.debug('Creating activity in Lofty', {
          contactId: activityData.contactId,
          type: activityData.type,
        });

        // TODO: Update endpoint path based on API docs
        const response = await this.client.post('/api/activities', activityData);

        logger.debug('Activity created successfully', { id: response.data.id });
        return response.data;
      },
      {
        maxRetries: config.population.maxRetries,
        shouldRetry: isRetryableError,
      }
    );
  }

  /**
   * Get contact count
   * @returns {Promise<number>} - Number of contacts
   */
  async getContactCount() {
    try {
      // TODO: Update endpoint based on API docs
      // Options: /api/contacts?count=true or /api/contacts/count
      const response = await this.client.get('/api/contacts?count=true');
      return response.data.count;
    } catch (error) {
      logger.error('Failed to get contact count', { error: error.message });
      throw error;
    }
  }

  /**
   * Get contact by ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} - Contact data
   */
  async getContact(contactId) {
    try {
      // TODO: Update endpoint based on API docs
      const response = await this.client.get(`/api/contacts/${contactId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get contact', { contactId, error: error.message });
      throw error;
    }
  }

  /**
   * Test API connection and authentication
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    try {
      logger.info('Testing Lofty API connection...');

      // TODO: Update with actual test endpoint (might be /api/me or /api/auth/test)
      const response = await this.client.get('/api/me');

      logger.success('Lofty API connection successful', {
        user: response.data.email || response.data.id,
      });

      return true;
    } catch (error) {
      logger.error('Lofty API connection failed', { error: error.message });
      return false;
    }
  }
}

export default LoftyClient;
