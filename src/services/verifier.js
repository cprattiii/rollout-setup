/**
 * Verification service
 * Verifies data population by checking against APIs
 */

import logger from '../utils/logger.js';
import ClozeClient from '../clients/cloze.js';
import LoftyClient from '../clients/lofty.js';

export class Verifier {
  constructor() {
    this.clozeClient = new ClozeClient();
    this.loftyClient = new LoftyClient();
  }

  /**
   * Verify a specific contact exists in platform
   * @param {string} platform - Platform name (cloze or lofty)
   * @param {string} contactId - Contact ID to verify
   * @returns {boolean} - True if contact exists
   */
  async verifyContact(platform, contactId) {
    const client = platform === 'cloze' ? this.clozeClient : this.loftyClient;

    try {
      const contact = await client.getContact(contactId);
      return !!contact;
    } catch (error) {
      logger.error(`Failed to verify contact ${contactId}`, error.message);
      return false;
    }
  }

  /**
   * Verify sample of contacts exist
   * @param {string} platform - Platform name
   * @param {Array} contactIds - Array of contact IDs to verify
   * @param {number} sampleSize - Number of contacts to verify (default: 10)
   * @returns {Object} - Verification results
   */
  async verifySampleContacts(platform, contactIds, sampleSize = 10) {
    const sample = contactIds.slice(0, Math.min(sampleSize, contactIds.length));

    logger.info(`Verifying ${sample.length} sample contacts in ${platform}...`);

    let verified = 0;
    let failed = 0;

    for (const contactId of sample) {
      const exists = await this.verifyContact(platform, contactId);
      if (exists) {
        verified++;
      } else {
        failed++;
      }
    }

    const result = {
      platform,
      sampleSize: sample.length,
      verified,
      failed,
      successRate: ((verified / sample.length) * 100).toFixed(1),
    };

    if (failed === 0) {
      logger.success(
        `All ${verified} sample contacts verified in ${platform}! ✓`
      );
    } else {
      logger.warn(
        `${verified}/${sample.length} contacts verified (${failed} failed) in ${platform}`
      );
    }

    return result;
  }

  /**
   * Verify data counts via API
   * @param {string} platform - Platform name
   * @returns {Object} - Count statistics from API
   */
  async verifyDataCounts(platform) {
    const client = platform === 'cloze' ? this.clozeClient : this.loftyClient;

    logger.info(`Fetching data counts from ${platform} API...`);

    try {
      // Note: These methods would need to be implemented in the API clients
      // For now, we'll return placeholder data
      const counts = {
        platform,
        contacts: 'N/A (requires API implementation)',
        properties: 'N/A (requires API implementation)',
        deals: 'N/A (requires API implementation)',
        activities: 'N/A (requires API implementation)',
      };

      logger.info(`${platform} data counts:`);
      logger.info(`  Contacts: ${counts.contacts}`);
      logger.info(`  Properties: ${counts.properties}`);
      logger.info(`  Deals: ${counts.deals}`);
      logger.info(`  Activities: ${counts.activities}`);

      return counts;
    } catch (error) {
      logger.error(`Failed to fetch counts from ${platform}`, error.message);
      throw error;
    }
  }

  /**
   * Verify email pattern correctness
   * @param {Array} contacts - Array of contacts to verify
   * @param {string} platform - Platform name (cloze or lofty)
   * @param {string} baseEmail - Base email address
   * @returns {Object} - Email verification results
   */
  verifyEmailPattern(contacts, platform, baseEmail) {
    logger.info(`Verifying email patterns for ${platform}...`);

    const [localPart, domain] = baseEmail.split('@');
    const expectedPattern = new RegExp(
      `^${localPart}\\+${platform}_\\d{4}@${domain}$`
    );

    let validCount = 0;
    let invalidCount = 0;
    const invalidEmails = [];

    for (const contact of contacts) {
      if (expectedPattern.test(contact.email)) {
        validCount++;
      } else {
        invalidCount++;
        invalidEmails.push(contact.email);
      }
    }

    const result = {
      platform,
      total: contacts.length,
      valid: validCount,
      invalid: invalidCount,
      invalidEmails: invalidEmails.slice(0, 5), // Show first 5 invalid
    };

    if (invalidCount === 0) {
      logger.success(
        `All ${validCount} email patterns are correct for ${platform}! ✓`
      );
    } else {
      logger.warn(
        `${invalidCount} invalid email patterns found in ${platform}`
      );
      logger.warn(`Sample invalid emails: ${invalidEmails.slice(0, 3).join(', ')}`);
    }

    return result;
  }

  /**
   * Verify deal-property linking distribution
   * @param {Array} deals - Array of deals
   * @returns {Object} - Linking verification results
   */
  verifyDealPropertyLinking(deals) {
    logger.info('Verifying deal-property linking distribution...');

    let withProperty = 0;
    let withoutProperty = 0;

    for (const deal of deals) {
      if (deal.propertyId) {
        withProperty++;
      } else {
        withoutProperty++;
      }
    }

    const total = deals.length;
    const withPropertyPercent = Math.round((withProperty / total) * 100);

    const result = {
      total,
      withProperty,
      withoutProperty,
      withPropertyPercent,
      expectedPercent: 70,
      withinRange: withPropertyPercent >= 55 && withPropertyPercent <= 85,
    };

    logger.info(`Deal-property linking: ${withPropertyPercent}% (target: 70%)`);

    if (result.withinRange) {
      logger.success('Deal-property linking is within acceptable range! ✓');
    } else {
      logger.warn(
        `Deal-property linking ${withPropertyPercent}% is outside expected 55-85% range`
      );
    }

    return result;
  }

  /**
   * Run comprehensive verification
   * @param {string} platform - Platform name
   * @param {Object} data - Object with contacts, properties, deals, activities
   * @param {string} baseEmail - Base email address
   * @param {Object} options - Verification options
   * @returns {Object} - Comprehensive verification results
   */
  async runVerification(platform, data, baseEmail, options = {}) {
    const { sampleSize = 10, skipAPICheck = false } = options;

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Running verification for ${platform.toUpperCase()}`);
    logger.info('='.repeat(60));

    const results = {
      platform,
      timestamp: new Date().toISOString(),
    };

    // 1. Verify email patterns
    results.emailPatterns = this.verifyEmailPattern(
      data.contacts,
      platform,
      baseEmail
    );

    // 2. Verify deal-property linking
    results.dealPropertyLinking = this.verifyDealPropertyLinking(data.deals);

    // 3. Verify sample contacts exist in API (if not skipped)
    if (!skipAPICheck) {
      const contactIds = data.contacts.map((c) => c.id);
      results.sampleContacts = await this.verifySampleContacts(
        platform,
        contactIds,
        sampleSize
      );

      // 4. Verify data counts from API
      results.dataCounts = await this.verifyDataCounts(platform);
    } else {
      logger.info('Skipping API verification checks (skipAPICheck=true)');
    }

    // Summary
    logger.info(`\n${platform.toUpperCase()} Verification Summary:`);
    logger.info(`  Email patterns: ${results.emailPatterns.valid}/${results.emailPatterns.total} valid`);
    logger.info(`  Deal linking: ${results.dealPropertyLinking.withPropertyPercent}% with property`);

    if (!skipAPICheck) {
      logger.info(`  Sample verification: ${results.sampleContacts.verified}/${results.sampleContacts.sampleSize} contacts found`);
    }

    const allPassed =
      results.emailPatterns.invalid === 0 &&
      results.dealPropertyLinking.withinRange;

    if (allPassed) {
      logger.success(`\n✅ ${platform.toUpperCase()} verification PASSED!`);
    } else {
      logger.warn(`\n⚠️  ${platform.toUpperCase()} verification completed with warnings`);
    }

    return results;
  }
}

export default Verifier;
