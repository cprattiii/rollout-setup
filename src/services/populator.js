/**
 * Population service
 * Orchestrates data generation and API population for both platforms
 */

import fs from 'fs';
import path from 'path';
import config from '../config.js';
import logger from '../utils/logger.js';
import RateLimiter from './rateLimit.js';
import ClozeClient from '../clients/cloze.js';
import LoftyClient from '../clients/lofty.js';
import { generateContacts } from '../generators/contact.js';
import { generatePropertiesForContact } from '../generators/property.js';
import { generateDealsForContact } from '../generators/deal.js';
import { generateActivitiesForContact } from '../generators/activity.js';

export class Populator {
  constructor(options = {}) {
    this.platform = options.platform || 'both'; // 'cloze', 'lofty', or 'both'
    this.contactCount = options.contactCount || config.population.contactCount;
    this.dryRun = options.dryRun || false;
    this.rateLimiter = new RateLimiter({
      batchSize: config.population.batchSize,
      batchDelay: config.population.batchDelayMs,
      maxConcurrent: config.population.maxConcurrent,
    });

    // Initialize API clients
    this.clozeClient = new ClozeClient();
    this.loftyClient = new LoftyClient();

    // Statistics
    this.stats = {
      cloze: this.createPlatformStats(),
      lofty: this.createPlatformStats(),
    };

    // Failed records
    this.failed = {
      cloze: [],
      lofty: [],
    };

    // Generated data (for export and verification)
    this.generatedData = {
      cloze: {
        contacts: [],
        properties: [],
        deals: [],
        activities: [],
      },
      lofty: {
        contacts: [],
        properties: [],
        deals: [],
        activities: [],
      },
    };
  }

  createPlatformStats() {
    return {
      contacts: { attempted: 0, succeeded: 0, failed: 0 },
      properties: { attempted: 0, succeeded: 0, failed: 0 },
      deals: { attempted: 0, succeeded: 0, failed: 0 },
      activities: { attempted: 0, succeeded: 0, failed: 0 },
      startTime: null,
      endTime: null,
    };
  }

  /**
   * Populate a single platform
   */
  async populatePlatform(platformName) {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Starting population for ${platformName.toUpperCase()}`);
    logger.info('='.repeat(60));

    const client = platformName === 'cloze' ? this.clozeClient : this.loftyClient;
    const stats = this.stats[platformName];
    stats.startTime = new Date();

    // Test connection (unless dry run)
    if (!this.dryRun) {
      logger.info(`Testing ${platformName} API connection...`);
      const connected = await client.testConnection();
      if (!connected) {
        logger.error(`Failed to connect to ${platformName} API - aborting`);
        return;
      }
    }

    // Generate contacts
    logger.info(`\nGenerating ${this.contactCount} contacts for ${platformName}...`);
    const contacts = generateContacts(
      platformName,
      this.contactCount,
      config.email.baseEmail
    );
    logger.success(`Generated ${contacts.length} contacts`);

    // Store generated contacts for export/verification
    this.generatedData[platformName].contacts = contacts;

    // Populate contacts with rate limiting
    logger.info(`\nPopulating contacts in ${platformName}...`);
    const contactResults = await this.populateContacts(platformName, client, contacts);

    // Filter successful contacts for further processing
    const successfulContacts = contactResults
      .filter((r) => r.success)
      .map((r) => r.result);

    logger.info(
      `\nSuccessfully created ${successfulContacts.length}/${contacts.length} contacts`
    );

    if (successfulContacts.length === 0) {
      logger.error('No contacts created - aborting further population');
      return;
    }

    // Populate properties
    logger.info(`\nPopulating properties for ${successfulContacts.length} contacts...`);
    const propertyResults = await this.populateProperties(platformName, client, successfulContacts);

    // Store successful properties for export/verification
    this.generatedData[platformName].properties = propertyResults
      .filter((r) => r.success)
      .map((r) => r.result);

    // Populate deals
    logger.info(`\nPopulating deals for ${successfulContacts.length} contacts...`);
    const dealResults = await this.populateDeals(platformName, client, successfulContacts);

    // Store successful deals for export/verification
    this.generatedData[platformName].deals = dealResults
      .filter((r) => r.success)
      .map((r) => r.result);

    // Populate activities
    logger.info(`\nPopulating activities for ${successfulContacts.length} contacts...`);
    const activityResults = await this.populateActivities(platformName, client, successfulContacts);

    // Store successful activities for export/verification
    this.generatedData[platformName].activities = activityResults
      .filter((r) => r.success)
      .map((r) => r.result);

    stats.endTime = new Date();
    logger.info(`\n${platformName.toUpperCase()} population complete!`);
  }

  /**
   * Populate contacts with rate limiting
   */
  async populateContacts(platformName, client, contacts) {
    const stats = this.stats[platformName];
    stats.contacts.attempted = contacts.length;

    const results = await this.rateLimiter.processBatch(contacts, async (contact) => {
      if (this.dryRun) {
        // Simulate success in dry run
        stats.contacts.succeeded++;
        return { ...contact, id: `dry_run_${Math.random()}` };
      }

      try {
        const created = await client.createContact(contact);
        stats.contacts.succeeded++;
        return { ...contact, ...created };
      } catch (error) {
        stats.contacts.failed++;
        this.failed[platformName].push({
          type: 'contact',
          data: contact,
          error: error.message,
        });
        throw error;
      }
    });

    return results;
  }

  /**
   * Populate properties for contacts
   */
  async populateProperties(platformName, client, contacts) {
    const stats = this.stats[platformName];

    // Generate properties for all contacts
    const allProperties = [];
    for (const contact of contacts) {
      const properties = generatePropertiesForContact(contact.id);
      // Add contact reference
      for (const property of properties) {
        allProperties.push({
          ...property,
          contactId: contact.id,
        });
      }
    }

    stats.properties.attempted = allProperties.length;
    logger.info(`  Generated ${allProperties.length} properties`);

    const results = await this.rateLimiter.processBatch(
      allProperties,
      async (property) => {
        if (this.dryRun) {
          stats.properties.succeeded++;
          return { ...property, id: `dry_run_${Math.random()}` };
        }

        try {
          const created = await client.createProperty(property);
          stats.properties.succeeded++;
          return { ...property, ...created };
        } catch (error) {
          stats.properties.failed++;
          this.failed[platformName].push({
            type: 'property',
            data: property,
            error: error.message,
          });
          throw error;
        }
      }
    );

    // Map properties back to contacts
    const propertyMap = new Map();
    for (const result of results) {
      if (result.success && result.result) {
        const contactId = result.result.contactId;
        if (!propertyMap.has(contactId)) {
          propertyMap.set(contactId, []);
        }
        propertyMap.get(contactId).push(result.result);
      }
    }

    // Add properties to contacts
    for (const contact of contacts) {
      contact.properties = propertyMap.get(contact.id) || [];
    }

    return results;
  }

  /**
   * Populate deals for contacts
   */
  async populateDeals(platformName, client, contacts) {
    const stats = this.stats[platformName];

    // Generate deals for all contacts
    const allDeals = [];
    for (const contact of contacts) {
      const deals = generateDealsForContact(
        contact.id,
        contact,
        contact.properties || []
      );
      allDeals.push(...deals);
    }

    stats.deals.attempted = allDeals.length;
    logger.info(`  Generated ${allDeals.length} deals`);

    const results = await this.rateLimiter.processBatch(allDeals, async (deal) => {
      if (this.dryRun) {
        stats.deals.succeeded++;
        return { ...deal, id: `dry_run_${Math.random()}` };
      }

      try {
        const created = await client.createDeal(deal);
        stats.deals.succeeded++;
        return { ...deal, ...created };
      } catch (error) {
        stats.deals.failed++;
        this.failed[platformName].push({
          type: 'deal',
          data: deal,
          error: error.message,
        });
        throw error;
      }
    });

    return results;
  }

  /**
   * Populate activities for contacts
   */
  async populateActivities(platformName, client, contacts) {
    const stats = this.stats[platformName];

    // Generate activities for all contacts
    const allActivities = [];
    for (const contact of contacts) {
      const activities = generateActivitiesForContact(contact.id, contact);
      allActivities.push(...activities);
    }

    stats.activities.attempted = allActivities.length;
    logger.info(`  Generated ${allActivities.length} activities`);

    const results = await this.rateLimiter.processBatch(
      allActivities,
      async (activity) => {
        if (this.dryRun) {
          stats.activities.succeeded++;
          return { ...activity, id: `dry_run_${Math.random()}` };
        }

        try {
          const created = await client.createActivity(activity);
          stats.activities.succeeded++;
          return { ...activity, ...created };
        } catch (error) {
          stats.activities.failed++;
          this.failed[platformName].push({
            type: 'activity',
            data: activity,
            error: error.message,
          });
          throw error;
        }
      }
    );

    return results;
  }

  /**
   * Run the complete population process
   */
  async populate() {
    const overallStart = new Date();

    logger.info('Starting Rollout Setup Data Population');
    logger.info(`Platform: ${this.platform}`);
    logger.info(`Contact Count: ${this.contactCount}`);
    logger.info(`Dry Run: ${this.dryRun ? 'YES' : 'NO'}`);
    logger.info(`Batch Size: ${config.population.batchSize}`);
    logger.info(`Batch Delay: ${config.population.batchDelayMs}ms`);
    logger.info(`Max Concurrent: ${config.population.maxConcurrent}`);

    try {
      // Populate based on platform selection
      if (this.platform === 'both' || this.platform === 'cloze') {
        await this.populatePlatform('cloze');
      }

      if (this.platform === 'both' || this.platform === 'lofty') {
        await this.populatePlatform('lofty');
      }

      // Save failed records
      await this.saveFailedRecords();

      // Print summary
      const overallEnd = new Date();
      this.printSummary(overallStart, overallEnd);
    } catch (error) {
      logger.error('Population failed with error', error);
      throw error;
    }
  }

  /**
   * Save failed records to file
   */
  async saveFailedRecords() {
    const outputDir = config.output.dir;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save Cloze failed records
    if (this.failed.cloze.length > 0) {
      const clozeFailedPath = path.join(outputDir, 'failed_cloze.json');
      fs.writeFileSync(clozeFailedPath, JSON.stringify(this.failed.cloze, null, 2));
      logger.info(`Saved ${this.failed.cloze.length} failed Cloze records to ${clozeFailedPath}`);
    }

    // Save Lofty failed records
    if (this.failed.lofty.length > 0) {
      const loftyFailedPath = path.join(outputDir, 'failed_lofty.json');
      fs.writeFileSync(loftyFailedPath, JSON.stringify(this.failed.lofty, null, 2));
      logger.info(`Saved ${this.failed.lofty.length} failed Lofty records to ${loftyFailedPath}`);
    }
  }

  /**
   * Print summary report
   */
  printSummary(startTime, endTime) {
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    logger.info('\n' + '='.repeat(60));
    logger.info('POPULATION SUMMARY');
    logger.info('='.repeat(60));

    if (this.platform === 'both' || this.platform === 'cloze') {
      this.printPlatformSummary('CLOZE', this.stats.cloze);
    }

    if (this.platform === 'both' || this.platform === 'lofty') {
      this.printPlatformSummary('LOFTY', this.stats.lofty);
    }

    logger.info('\nOVERALL:');
    logger.info(`  Total Duration: ${duration} seconds`);
    logger.info('='.repeat(60));

    // Success/warning status
    const totalFailed =
      (this.stats.cloze?.contacts.failed || 0) +
      (this.stats.lofty?.contacts.failed || 0);

    if (totalFailed === 0) {
      logger.success('\n✅ Population completed successfully with no failures!');
    } else {
      logger.warn(
        `\n⚠️  Population completed with ${totalFailed} failed contact(s). Check failed_*.json files.`
      );
    }
  }

  /**
   * Print platform-specific summary
   */
  printPlatformSummary(name, stats) {
    const duration = stats.endTime
      ? ((stats.endTime - stats.startTime) / 1000).toFixed(1)
      : 0;

    logger.info(`\n${name}:`);
    logger.info(`  Duration: ${duration} seconds`);
    logger.info(
      `  Contacts: ${stats.contacts.succeeded}/${stats.contacts.attempted} (${stats.contacts.failed} failed)`
    );
    logger.info(
      `  Properties: ${stats.properties.succeeded}/${stats.properties.attempted} (${stats.properties.failed} failed)`
    );
    logger.info(
      `  Deals: ${stats.deals.succeeded}/${stats.deals.attempted} (${stats.deals.failed} failed)`
    );
    logger.info(
      `  Activities: ${stats.activities.succeeded}/${stats.activities.attempted} (${stats.activities.failed} failed)`
    );

    const successRate =
      stats.contacts.attempted > 0
        ? ((stats.contacts.succeeded / stats.contacts.attempted) * 100).toFixed(1)
        : 0;
    logger.info(`  Success Rate: ${successRate}%`);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      stats: this.stats,
      failed: this.failed,
    };
  }

  /**
   * Get generated data for export/verification
   */
  getGeneratedData() {
    return this.generatedData;
  }
}

export default Populator;
