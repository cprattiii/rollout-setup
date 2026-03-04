/**
 * Property data generator
 * Generates realistic property data linked to contacts
 */

import { faker } from '@faker-js/faker';

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Land'];

const PROPERTY_STATUSES = ['For Sale', 'Under Contract', 'Sold'];

// Price ranges by property type
const PRICE_RANGES = {
  Residential: { min: 150000, max: 2000000 },
  Commercial: { min: 500000, max: 5000000 },
  Land: { min: 50000, max: 1000000 },
};

// Square footage ranges by property type
const SQFT_RANGES = {
  Residential: { min: 800, max: 5000 },
  Commercial: { min: 2000, max: 20000 },
  Land: { min: 5000, max: 50000 }, // sq ft of land
};

/**
 * Generate a realistic property price based on type
 * @param {string} propertyType - Property type
 * @returns {number} - Price
 */
function generatePrice(propertyType) {
  const range = PRICE_RANGES[propertyType];
  // Round to nearest $5,000
  const price = faker.number.int({ min: range.min, max: range.max });
  return Math.round(price / 5000) * 5000;
}

/**
 * Generate square footage based on property type
 * @param {string} propertyType - Property type
 * @returns {number} - Square footage
 */
function generateSquareFeet(propertyType) {
  const range = SQFT_RANGES[propertyType];
  return faker.number.int({ min: range.min, max: range.max });
}

/**
 * Generate residential property details
 * @returns {Object} - Residential details
 */
function generateResidentialDetails() {
  return {
    bedrooms: faker.number.int({ min: 1, max: 6 }),
    bathrooms: faker.number.float({ min: 1, max: 5, multipleOf: 0.5 }),
  };
}

/**
 * Generate a single property
 * @param {string} contactId - Associated contact ID
 * @returns {Object} - Property data
 */
export function generateProperty(contactId) {
  const propertyType = faker.helpers.arrayElement(PROPERTY_TYPES);
  const squareFeet = generateSquareFeet(propertyType);

  const property = {
    contactId,
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip: faker.location.zipCode('#####'),
      country: 'USA',
    },
    propertyType,
    price: generatePrice(propertyType),
    status: faker.helpers.arrayElement(PROPERTY_STATUSES),
    squareFeet,
  };

  // Add residential-specific fields
  if (propertyType === 'Residential') {
    Object.assign(property, generateResidentialDetails());
  }

  return property;
}

/**
 * Generate 1-2 properties for a contact
 * @param {string} contactId - Associated contact ID
 * @returns {Array} - Array of 1-2 properties
 */
export function generatePropertiesForContact(contactId) {
  const count = faker.helpers.arrayElement([1, 2]); // Random 1 or 2
  const properties = [];

  for (let i = 0; i < count; i++) {
    properties.push(generateProperty(contactId));
  }

  return properties;
}

/**
 * Generate properties for multiple contacts
 * @param {Array} contacts - Array of contacts with IDs
 * @returns {Array} - Array of all properties
 */
export function generatePropertiesForContacts(contacts) {
  const allProperties = [];

  for (const contact of contacts) {
    const properties = generatePropertiesForContact(contact.id);
    allProperties.push(...properties);
  }

  return allProperties;
}

/**
 * Verify property type distribution
 * @param {Array} properties - Array of properties
 * @returns {Object} - Distribution statistics
 */
export function verifyPropertyDistribution(properties) {
  const distribution = {
    Residential: 0,
    Commercial: 0,
    Land: 0,
  };

  for (const property of properties) {
    distribution[property.propertyType]++;
  }

  const total = properties.length;
  const percentages = {};
  for (const [type, count] of Object.entries(distribution)) {
    percentages[type] = Math.round((count / total) * 100);
  }

  return {
    counts: distribution,
    percentages,
    total,
  };
}

export default {
  generateProperty,
  generatePropertiesForContact,
  generatePropertiesForContacts,
  verifyPropertyDistribution,
};
