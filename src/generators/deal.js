/**
 * Deal data generator
 * Generates realistic deal/transaction data with property linking
 */

import { faker } from '@faker-js/faker';

const DEAL_STATUSES = [
  'Prospect',
  'Qualified',
  'Under Contract',
  'Closed-Won',
  'Closed-Lost',
];

const DEAL_NAME_TEMPLATES = [
  '{address} - {type}',
  '{type} Deal - {lastName}',
  '{city} Property - {type}',
  '{lastName} {type}',
];

const DEAL_TYPES = [
  'Purchase',
  'Sale',
  'Listing',
  'Rental',
  'Investment',
];

/**
 * Generate a deal name
 * @param {Object} contact - Contact data
 * @param {Object} property - Property data (optional)
 * @returns {string} - Deal name
 */
function generateDealName(contact, property = null) {
  const template = faker.helpers.arrayElement(DEAL_NAME_TEMPLATES);
  const dealType = faker.helpers.arrayElement(DEAL_TYPES);

  let name = template
    .replace('{type}', dealType)
    .replace('{lastName}', contact.lastName);

  if (property) {
    name = name
      .replace('{address}', property.address.street.split(' ')[0])
      .replace('{city}', property.address.city);
  } else {
    name = name
      .replace('{address}', faker.location.street())
      .replace('{city}', faker.location.city());
  }

  return name;
}

/**
 * Generate expected or actual close date based on status
 * @param {string} status - Deal status
 * @returns {Object} - Object with expectedCloseDate and actualCloseDate
 */
function generateCloseDates(status) {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  if (status === 'Closed-Won' || status === 'Closed-Lost') {
    // Closed deals have actual close date in the past
    const actualCloseDate = faker.date.between({
      from: sixMonthsAgo,
      to: now,
    });
    return {
      expectedCloseDate: null,
      actualCloseDate: actualCloseDate.toISOString(),
    };
  } else {
    // Open deals have expected close date in the future
    const threeMonthsFromNow = new Date(now);
    threeMonthsFromNow.setMonth(now.getMonth() + 3);
    const expectedCloseDate = faker.date.between({
      from: now,
      to: threeMonthsFromNow,
    });
    return {
      expectedCloseDate: expectedCloseDate.toISOString(),
      actualCloseDate: null,
    };
  }
}

/**
 * Generate deal value based on property or random
 * @param {Object} property - Property data (optional)
 * @returns {number} - Deal value
 */
function generateDealValue(property = null) {
  if (property && property.price) {
    // Use property price as base, with some variation (+/- 10%)
    const variation = faker.number.float({ min: 0.9, max: 1.1, multipleOf: 0.01 });
    return Math.round(property.price * variation);
  }

  // Random deal value for deals without property
  return Math.round(faker.number.int({ min: 50000, max: 1000000 }) / 5000) * 5000;
}

/**
 * Generate a single deal
 * @param {string} contactId - Associated contact ID
 * @param {Object} contact - Contact data
 * @param {Object} property - Property data (optional, can be null)
 * @returns {Object} - Deal data
 */
export function generateDeal(contactId, contact, property = null) {
  const status = faker.helpers.arrayElement(DEAL_STATUSES);
  const dates = generateCloseDates(status);

  const deal = {
    contactId,
    name: generateDealName(contact, property),
    status,
    value: generateDealValue(property),
    expectedCloseDate: dates.expectedCloseDate,
    actualCloseDate: dates.actualCloseDate,
    propertyId: property ? property.id : null,
  };

  return deal;
}

/**
 * Generate 1-5 deals for a contact with property linking logic
 * @param {string} contactId - Contact ID
 * @param {Object} contact - Contact data
 * @param {Array} properties - Array of properties for this contact
 * @returns {Array} - Array of 1-5 deals
 */
export function generateDealsForContact(contactId, contact, properties = []) {
  const dealCount = faker.number.int({ min: 1, max: 5 });
  const deals = [];

  for (let i = 0; i < dealCount; i++) {
    // 70% chance of linking to a property if properties exist
    let property = null;
    if (properties.length > 0 && Math.random() < 0.7) {
      // Select random property from available properties
      property = faker.helpers.arrayElement(properties);
    }

    deals.push(generateDeal(contactId, contact, property));
  }

  return deals;
}

/**
 * Generate deals for multiple contacts
 * @param {Array} contacts - Array of contacts with IDs and properties
 * @returns {Array} - Array of all deals
 */
export function generateDealsForContacts(contacts) {
  const allDeals = [];

  for (const contact of contacts) {
    const deals = generateDealsForContact(
      contact.id,
      contact,
      contact.properties || []
    );
    allDeals.push(...deals);
  }

  return allDeals;
}

/**
 * Verify deal-property linking distribution
 * @param {Array} deals - Array of deals
 * @returns {Object} - Distribution statistics
 */
export function verifyDealPropertyLinking(deals) {
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
  const withoutPropertyPercent = Math.round((withoutProperty / total) * 100);

  return {
    withProperty,
    withoutProperty,
    total,
    withPropertyPercent,
    withoutPropertyPercent,
  };
}

/**
 * Verify deal status distribution
 * @param {Array} deals - Array of deals
 * @returns {Object} - Distribution statistics
 */
export function verifyDealStatusDistribution(deals) {
  const distribution = {};

  for (const status of DEAL_STATUSES) {
    distribution[status] = 0;
  }

  for (const deal of deals) {
    distribution[deal.status]++;
  }

  const total = deals.length;
  const percentages = {};
  for (const [status, count] of Object.entries(distribution)) {
    percentages[status] = Math.round((count / total) * 100);
  }

  return {
    counts: distribution,
    percentages,
    total,
  };
}

export default {
  generateDeal,
  generateDealsForContact,
  generateDealsForContacts,
  verifyDealPropertyLinking,
  verifyDealStatusDistribution,
};
