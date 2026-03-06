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
        'Authorization': `token ${this.apiKey}`,
      },
      timeout: 30000,
    });
  }

  /**
   * Create a contact (lead) in Lofty
   * Note: Lofty requires a three-step process:
   * 1. POST /leads to create the lead (gets leadId)
   * 2. PUT /leads/:id to update with email/phone (POST doesn't save these fields)
   * 3. PUT /leads/:id with userEmailList to mark email as valid
   * @param {Object} contactData - Contact data
   * @returns {Promise<Object>} - Created contact with leadId
   */
  async createContact(contactData) {
    return retryWithBackoff(
      async () => {
        logger.debug('Creating lead in Lofty', { email: contactData.email });

        // Step 1: Create the lead (POST)
        const createResponse = await this.client.post('/leads', {
          firstName: contactData.firstName,
          lastName: contactData.lastName,
        });

        const leadId = createResponse.data.leadId;
        logger.debug('Lead created, updating with contact info', { leadId });

        // Step 2: Update with email and phone (PUT)
        const updateResponse = await this.client.put(`/leads/${leadId}`, {
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          emails: [contactData.email],  // Lofty expects array
          phones: [contactData.phone],   // Lofty expects array
          cannotEmail: false,             // Enable email marketing
          unsubscription: false,          // Not unsubscribed
        });

        // Get leadUserId and teamId from the update response
        const leadUserId = updateResponse.data.lead?.leadUserId || updateResponse.data.leadUserId;
        const teamId = updateResponse.data.lead?.teamId || updateResponse.data.teamId;

        // Step 3: Mark email as valid (otherwise Lofty marks it as invalid by default)
        if (leadUserId && teamId) {
          await this.client.put(`/leads/${leadId}`, {
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            emails: [contactData.email],
            phones: [contactData.phone],
            userEmailList: [{
              userId: leadUserId,
              familyMemberId: 0,
              email: contactData.email,
              valid: true,              // Mark as valid
              verified: false,
              bounced: false,
              isPrimary: true,
              primary: true,
              teamId: teamId,
              deleteFlag: false,
              description: ""
            }]
          });
        }

        logger.debug('Lead updated with email/phone', { leadId, email: contactData.email });
        return { id: leadId, leadId };
      },
      {
        maxRetries: config.population.maxRetries,
        shouldRetry: isRetryableError,
      }
    );
  }

  /**
   * Create a property in Lofty
   * Note: Lofty doesn't have a separate properties endpoint.
   * Properties are part of the lead data structure.
   * @param {Object} propertyData - Property data
   * @returns {Promise<Object>} - Skipped (not supported)
   */
  async createProperty(propertyData) {
    logger.debug('Skipping property creation - not supported by Lofty API', {
      contactId: propertyData.contactId,
    });
    // Lofty doesn't have a separate properties endpoint
    // Properties are embedded in leads
    return { id: null, skipped: true };
  }

  /**
   * Create a deal in Lofty
   * Note: Lofty doesn't have a separate deals endpoint.
   * Transaction information is part of the lead lifecycle/stages.
   * @param {Object} dealData - Deal data
   * @returns {Promise<Object>} - Skipped (not supported)
   */
  async createDeal(dealData) {
    logger.debug('Skipping deal creation - not supported by Lofty API', {
      contactId: dealData.contactId,
      name: dealData.name,
    });
    // Lofty doesn't have a separate deals endpoint
    // Deals are managed through lead stages
    return { id: null, skipped: true };
  }

  /**
   * Create an activity in Lofty
   * Note: Lofty doesn't have a generic activities endpoint.
   * Use /notes or /tasks endpoints instead, which require specific parameters.
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} - Skipped (not supported)
   */
  async createActivity(activityData) {
    logger.debug('Skipping activity creation - not supported by Lofty API', {
      contactId: activityData.contactId,
      type: activityData.type,
    });
    // Lofty doesn't have a generic activities endpoint
    // Activities would need to be created as notes or tasks with specific formats
    return { id: null, skipped: true };
  }

  /**
   * Get lead count
   * @returns {Promise<number>} - Number of leads
   */
  async getContactCount() {
    try {
      const response = await this.client.get('/leads');
      return response.data._metadata.total;
    } catch (error) {
      logger.error('Failed to get lead count', { error: error.message });
      throw error;
    }
  }

  /**
   * Get lead by ID
   * @param {string} leadId - Lead ID
   * @returns {Promise<Object>} - Lead data
   */
  async getContact(leadId) {
    try {
      const response = await this.client.get(`/leads/${leadId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get lead', { leadId, error: error.message });
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

      const response = await this.client.get('/me');

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
