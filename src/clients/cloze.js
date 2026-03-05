/**
 * Cloze API Client
 *
 * TODO: Update endpoints and schemas once API documentation is available
 */

import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';
import { retryWithBackoff, isRetryableError } from '../services/retry.js';

export class ClozeClient {
  constructor() {
    this.baseUrl = config.cloze.baseUrl;
    this.apiKey = config.cloze.apiKey;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      params: {
        api_key: this.apiKey,  // Cloze also accepts api_key as query param
      },
      timeout: 30000,
    });
  }

  /**
   * Create a contact in Cloze
   * @param {Object} contactData - Contact data
   * @returns {Promise<Object>} - Created contact with ID
   */
  async createContact(contactData) {
    return retryWithBackoff(
      async () => {
        logger.debug('Creating contact in Cloze', { email: contactData.email });

        // Map our data to Cloze format
        // NOTE: Cloze uses "value" not "email"/"phone" in arrays
        const clozeContact = {
          name: `${contactData.firstName} ${contactData.lastName}`,
          emails: [
            {
              value: contactData.email,
            },
          ],
          phones: [
            {
              value: contactData.phone,
            },
          ],
          addresses: contactData.address ? [
            {
              street: contactData.address.street,
              city: contactData.address.city,
              state: contactData.address.state,
              zip: contactData.address.zip,
            },
          ] : [],
          company: contactData.company || '',
          customFields: {
            contactType: contactData.type,
            emailSubscribed: contactData.emailSubscriptionStatus,
            ...contactData.customFields,
          },
        };

        const response = await this.client.post('/people/update', clozeContact);

        logger.debug('Contact created successfully', { id: response.data.id });
        return {
          id: response.data.id,
          ...contactData,
        };
      },
      {
        maxRetries: config.population.maxRetries,
        shouldRetry: isRetryableError,
      }
    );
  }

  /**
   * Create a property in Cloze
   * @param {Object} propertyData - Property data
   * @returns {Promise<Object>} - Created property with ID
   */
  async createProperty(propertyData) {
    return retryWithBackoff(
      async () => {
        logger.debug('Creating property in Cloze', {
          contactId: propertyData.contactId,
        });

        // Create as a project with property type
        const clozeProperty = {
          name: `Property: ${propertyData.address.street}`,
          people: [propertyData.contactId],
          customFields: {
            entityType: 'property',
            address: propertyData.address.street,
            city: propertyData.address.city,
            state: propertyData.address.state,
            zip: propertyData.address.zip,
            type: propertyData.type,
            price: propertyData.price,
            bedrooms: propertyData.bedrooms,
            bathrooms: propertyData.bathrooms,
            squareFeet: propertyData.squareFeet,
          },
        };

        const response = await this.client.post('/projects/create', clozeProperty);

        logger.debug('Property created successfully', { id: response.data.id });
        return {
          id: response.data.id,
          ...propertyData,
        };
      },
      {
        maxRetries: config.population.maxRetries,
        shouldRetry: isRetryableError,
      }
    );
  }

  /**
   * Create a deal in Cloze
   * @param {Object} dealData - Deal data
   * @returns {Promise<Object>} - Created deal with ID
   */
  async createDeal(dealData) {
    return retryWithBackoff(
      async () => {
        logger.debug('Creating deal in Cloze', {
          contactId: dealData.contactId,
          name: dealData.name,
        });

        const clozeDeal = {
          name: dealData.name,
          people: [dealData.contactId],
          stage: dealData.status.toLowerCase().replace(/\s+/g, '-'),
          value: dealData.value,
          expectedCloseDate: dealData.expectedCloseDate,
          actualCloseDate: dealData.actualCloseDate,
          customFields: {
            propertyId: dealData.propertyId,
            dealType: 'real-estate',
          },
        };

        const response = await this.client.post('/projects/create', clozeDeal);

        logger.debug('Deal created successfully', { id: response.data.id });
        return {
          id: response.data.id,
          ...dealData,
        };
      },
      {
        maxRetries: config.population.maxRetries,
        shouldRetry: isRetryableError,
      }
    );
  }

  /**
   * Create an activity in Cloze
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} - Created activity with ID
   */
  async createActivity(activityData) {
    return retryWithBackoff(
      async () => {
        logger.debug('Creating activity in Cloze', {
          contactId: activityData.contactId,
          type: activityData.type,
        });

        const clozeNote = {
          subject: activityData.subject,
          body: activityData.description,
          people: [activityData.contactId],
          date: activityData.timestamp,
          type: activityData.type.toLowerCase(),
        };

        const response = await this.client.post('/timeline/content/create', clozeNote);

        logger.debug('Activity created successfully', { id: response.data.id });
        return {
          id: response.data.id,
          ...activityData,
        };
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
      // Options: /contacts/count or /contacts?limit=1 with count header
      const response = await this.client.get('/contacts/count');
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
      const response = await this.client.get(`/contacts/${contactId}`);
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
      logger.info('Testing Cloze API connection...');

      // Use Cloze's user profile endpoint to test connection
      const response = await this.client.get('/user/profile');

      logger.success('Cloze API connection successful', {
        user: response.data.email || response.data.id,
      });

      return true;
    } catch (error) {
      logger.error('Cloze API connection failed', { error: error.message });
      return false;
    }
  }
}

export default ClozeClient;
