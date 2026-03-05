/**
 * Contact data generator
 * Generates realistic contact data with proper email patterns
 */

import { faker } from '@faker-js/faker';

// Contact type distribution (40% Buyer, 30% Lead, 20% Seller, 10% Past Client)
const CONTACT_TYPES = [
  { type: 'Buyer', weight: 0.4 },
  { type: 'Lead', weight: 0.3 },
  { type: 'Seller', weight: 0.2 },
  { type: 'Past Client', weight: 0.1 },
];

const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Open House',
  'Social Media',
  'Cold Call',
  'Email Campaign',
  'Online Ad',
  'Walk-in',
];

const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Nurturing',
  'Cold',
];

const CONTACT_METHODS = ['Email', 'Phone', 'Text'];

const BUDGET_RANGES = [
  'Under $200k',
  '$200k - $400k',
  '$400k - $600k',
  '$600k - $800k',
  '$800k - $1M',
  'Over $1M',
];

const PROPERTY_INTERESTS = [
  'Single Family Home',
  'Condo',
  'Townhouse',
  'Multi-Family',
  'Land',
  'Commercial',
  'Investment Property',
];

/**
 * Generate email address with platform-specific pattern
 * @param {string} platform - 'cloze' or 'lofty'
 * @param {number} index - Contact number (1-1000)
 * @param {string} baseEmail - Base email address
 * @returns {string} - Formatted email
 */
export function generateEmail(platform, index, baseEmail) {
  const [localPart, domain] = baseEmail.split('@');
  const paddedIndex = String(index).padStart(2, '0'); // Zero-pad to 2 digits
  return `${localPart}+${platform}_${paddedIndex}@${domain}`;
}

/**
 * Format phone number in US format
 * @param {string} phone - Raw phone number
 * @returns {string} - Formatted phone (123) 456-7890
 */
export function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Select contact type based on weighted distribution
 * @returns {string} - Contact type
 */
export function selectContactType() {
  const random = Math.random();
  let cumulative = 0;

  for (const { type, weight } of CONTACT_TYPES) {
    cumulative += weight;
    if (random <= cumulative) {
      return type;
    }
  }

  return 'Buyer'; // fallback
}

/**
 * Generate a single contact
 * @param {string} platform - 'cloze' or 'lofty'
 * @param {number} index - Contact number (1-1000)
 * @param {string} baseEmail - Base email address
 * @returns {Object} - Contact data
 */
export function generateContact(platform, index, baseEmail) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const contactType = selectContactType();

  const contact = {
    firstName,
    lastName,
    email: generateEmail(platform, index, baseEmail),
    phone: formatPhone(faker.string.numeric(10)),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip: faker.location.zipCode('#####'),
      country: 'USA',
    },
    emailSubscriptionStatus: true,
    customFields: {
      contactType,
      leadSource: faker.helpers.arrayElement(LEAD_SOURCES),
      leadStatus: faker.helpers.arrayElement(LEAD_STATUSES),
      preferredContactMethod: faker.helpers.arrayElement(CONTACT_METHODS),
    },
  };

  // Add budget range for buyers
  if (contactType === 'Buyer') {
    contact.customFields.budgetRange = faker.helpers.arrayElement(BUDGET_RANGES);
  }

  // Add property interests (1-3 interests)
  contact.customFields.propertyInterests = faker.helpers.arrayElements(
    PROPERTY_INTERESTS,
    { min: 1, max: 3 }
  );

  return contact;
}

/**
 * Generate multiple contacts for a platform
 * @param {string} platform - 'cloze' or 'lofty'
 * @param {number} count - Number of contacts to generate
 * @param {string} baseEmail - Base email address
 * @returns {Array} - Array of contact objects
 */
export function generateContacts(platform, count, baseEmail) {
  const contacts = [];

  for (let i = 1; i <= count; i++) {
    contacts.push(generateContact(platform, i, baseEmail));
  }

  return contacts;
}

/**
 * Verify contact type distribution
 * @param {Array} contacts - Array of contacts
 * @returns {Object} - Distribution statistics
 */
export function verifyDistribution(contacts) {
  const distribution = {
    Buyer: 0,
    Lead: 0,
    Seller: 0,
    'Past Client': 0,
  };

  for (const contact of contacts) {
    const type = contact.customFields.contactType;
    distribution[type]++;
  }

  // Calculate percentages
  const total = contacts.length;
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
  generateContact,
  generateContacts,
  generateEmail,
  formatPhone,
  selectContactType,
  verifyDistribution,
};
