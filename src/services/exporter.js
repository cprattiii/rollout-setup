/**
 * Data export service
 * Exports generated data to JSON and CSV formats
 */

import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import config from '../config.js';
import logger from '../utils/logger.js';

export class Exporter {
  constructor(outputDir = null) {
    this.outputDir = outputDir || config.output.dir;

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Export data to JSON format
   * @param {string} filename - Output filename
   * @param {Object|Array} data - Data to export
   */
  async exportJSON(filename, data) {
    const filePath = path.join(this.outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.success(`Exported JSON to ${filePath}`);
    return filePath;
  }

  /**
   * Export contacts to CSV
   * @param {string} filename - Output filename
   * @param {Array} contacts - Array of contacts
   */
  async exportContactsCSV(filename, contacts) {
    const filePath = path.join(this.outputDir, filename);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'firstName', title: 'First Name' },
        { id: 'lastName', title: 'Last Name' },
        { id: 'email', title: 'Email' },
        { id: 'phone', title: 'Phone' },
        { id: 'company', title: 'Company' },
        { id: 'type', title: 'Type' },
        { id: 'address', title: 'Address' },
        { id: 'city', title: 'City' },
        { id: 'state', title: 'State' },
        { id: 'zip', title: 'Zip' },
      ],
    });

    // Flatten address for CSV
    const flatContacts = contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      company: c.company,
      type: c.type,
      address: c.address?.street || '',
      city: c.address?.city || '',
      state: c.address?.state || '',
      zip: c.address?.zip || '',
    }));

    await csvWriter.writeRecords(flatContacts);
    logger.success(`Exported ${contacts.length} contacts to CSV: ${filePath}`);
    return filePath;
  }

  /**
   * Export properties to CSV
   * @param {string} filename - Output filename
   * @param {Array} properties - Array of properties
   */
  async exportPropertiesCSV(filename, properties) {
    const filePath = path.join(this.outputDir, filename);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'contactId', title: 'Contact ID' },
        { id: 'type', title: 'Type' },
        { id: 'address', title: 'Address' },
        { id: 'city', title: 'City' },
        { id: 'state', title: 'State' },
        { id: 'zip', title: 'Zip' },
        { id: 'price', title: 'Price' },
        { id: 'bedrooms', title: 'Bedrooms' },
        { id: 'bathrooms', title: 'Bathrooms' },
        { id: 'squareFeet', title: 'Square Feet' },
      ],
    });

    // Flatten properties for CSV
    const flatProperties = properties.map((p) => ({
      id: p.id,
      contactId: p.contactId,
      type: p.type,
      address: p.address?.street || '',
      city: p.address?.city || '',
      state: p.address?.state || '',
      zip: p.address?.zip || '',
      price: p.price,
      bedrooms: p.bedrooms || '',
      bathrooms: p.bathrooms || '',
      squareFeet: p.squareFeet || '',
    }));

    await csvWriter.writeRecords(flatProperties);
    logger.success(`Exported ${properties.length} properties to CSV: ${filePath}`);
    return filePath;
  }

  /**
   * Export deals to CSV
   * @param {string} filename - Output filename
   * @param {Array} deals - Array of deals
   */
  async exportDealsCSV(filename, deals) {
    const filePath = path.join(this.outputDir, filename);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'contactId', title: 'Contact ID' },
        { id: 'propertyId', title: 'Property ID' },
        { id: 'name', title: 'Name' },
        { id: 'status', title: 'Status' },
        { id: 'value', title: 'Value' },
        { id: 'expectedCloseDate', title: 'Expected Close Date' },
        { id: 'actualCloseDate', title: 'Actual Close Date' },
      ],
    });

    await csvWriter.writeRecords(deals);
    logger.success(`Exported ${deals.length} deals to CSV: ${filePath}`);
    return filePath;
  }

  /**
   * Export activities to CSV
   * @param {string} filename - Output filename
   * @param {Array} activities - Array of activities
   */
  async exportActivitiesCSV(filename, activities) {
    const filePath = path.join(this.outputDir, filename);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'contactId', title: 'Contact ID' },
        { id: 'type', title: 'Type' },
        { id: 'subject', title: 'Subject' },
        { id: 'description', title: 'Description' },
        { id: 'timestamp', title: 'Timestamp' },
      ],
    });

    await csvWriter.writeRecords(activities);
    logger.success(`Exported ${activities.length} activities to CSV: ${filePath}`);
    return filePath;
  }

  /**
   * Export all data for a platform
   * @param {string} platform - Platform name (cloze or lofty)
   * @param {Object} data - Object with contacts, properties, deals, activities arrays
   * @param {string} format - Export format: 'json', 'csv', or 'both'
   */
  async exportPlatformData(platform, data, format = 'both') {
    const exports = [];

    // JSON exports
    if (format === 'json' || format === 'both') {
      exports.push(
        await this.exportJSON(`${platform}_contacts.json`, data.contacts)
      );
      exports.push(
        await this.exportJSON(`${platform}_properties.json`, data.properties)
      );
      exports.push(
        await this.exportJSON(`${platform}_deals.json`, data.deals)
      );
      exports.push(
        await this.exportJSON(`${platform}_activities.json`, data.activities)
      );
    }

    // CSV exports
    if (format === 'csv' || format === 'both') {
      exports.push(
        await this.exportContactsCSV(`${platform}_contacts.csv`, data.contacts)
      );
      exports.push(
        await this.exportPropertiesCSV(`${platform}_properties.csv`, data.properties)
      );
      exports.push(
        await this.exportDealsCSV(`${platform}_deals.csv`, data.deals)
      );
      exports.push(
        await this.exportActivitiesCSV(`${platform}_activities.csv`, data.activities)
      );
    }

    logger.success(`Exported all ${platform} data (${format} format)`);
    return exports;
  }
}

export default Exporter;
