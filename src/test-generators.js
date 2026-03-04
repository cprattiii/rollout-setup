/**
 * Test script for Phase 2 generators
 * Tests contact and property data generation
 */

import logger from './utils/logger.js';
import validator from './utils/validator.js';
import {
  generateContacts,
  generateEmail,
  verifyDistribution,
} from './generators/contact.js';
import {
  generatePropertiesForContact,
  verifyPropertyDistribution,
} from './generators/property.js';

async function testGenerators() {
  logger.info('=== Testing Phase 2 Generators ===\n');

  // Test 1: Email pattern generation
  logger.info('Test 1: Email pattern generation');
  const clozeEmail = generateEmail('cloze', 1, 'carl.pratt@constantcontact.com');
  const loftyEmail = generateEmail('lofty', 1, 'carl.pratt@constantcontact.com');
  const email1000 = generateEmail('cloze', 1000, 'carl.pratt@constantcontact.com');

  console.log('  Cloze #1:', clozeEmail);
  console.log('  Lofty #1:', loftyEmail);
  console.log('  Cloze #1000:', email1000);

  if (
    clozeEmail === 'carl.pratt+cloze_0001@constantcontact.com' &&
    loftyEmail === 'carl.pratt+lofty_0001@constantcontact.com' &&
    email1000 === 'carl.pratt+cloze_1000@constantcontact.com'
  ) {
    logger.success('Email pattern generation passed!');
  } else {
    logger.failure('Email pattern generation failed!');
  }
  console.log('');

  // Test 2: Generate sample contacts
  logger.info('Test 2: Generate 100 sample contacts for Cloze');
  const contacts = generateContacts('cloze', 100, 'carl.pratt@constantcontact.com');

  console.log(`  Generated ${contacts.length} contacts`);
  console.log('  Sample contact:', JSON.stringify(contacts[0], null, 2));

  // Validate all contacts
  let validCount = 0;
  for (const contact of contacts) {
    try {
      validator.validateContact(contact);
      validCount++;
    } catch (error) {
      logger.error(`Validation failed for contact ${contact.email}`, error.message);
    }
  }

  if (validCount === contacts.length) {
    logger.success(`All ${contacts.length} contacts passed validation!`);
  } else {
    logger.failure(`Only ${validCount}/${contacts.length} contacts are valid`);
  }
  console.log('');

  // Test 3: Verify contact type distribution
  logger.info('Test 3: Verify contact type distribution');
  const distribution = verifyDistribution(contacts);
  console.log('  Distribution:');
  for (const [type, percentage] of Object.entries(distribution.percentages)) {
    console.log(`    ${type}: ${percentage}% (${distribution.counts[type]} contacts)`);
  }

  // Check if distribution is approximately correct (within 10% tolerance)
  const targets = { Buyer: 40, Lead: 30, Seller: 20, 'Past Client': 10 };
  let distributionValid = true;
  for (const [type, target] of Object.entries(targets)) {
    const actual = distribution.percentages[type];
    if (Math.abs(actual - target) > 10) {
      distributionValid = false;
      logger.warn(`${type} distribution is ${actual}%, expected ~${target}%`);
    }
  }

  if (distributionValid) {
    logger.success('Contact type distribution is within acceptable range!');
  }
  console.log('');

  // Test 4: Generate properties
  logger.info('Test 4: Generate properties for contacts');
  const contactsWithIds = contacts.map((c, i) => ({ ...c, id: `contact_${i}` }));

  let totalProperties = 0;
  const propertyCounts = { 1: 0, 2: 0 };

  for (const contact of contactsWithIds.slice(0, 10)) {
    const properties = generatePropertiesForContact(contact.id);
    totalProperties += properties.length;
    propertyCounts[properties.length]++;

    if (properties.length === 0) {
      logger.failure(`Contact ${contact.id} has 0 properties!`);
    }
  }

  console.log(`  10 contacts generated ${totalProperties} properties`);
  console.log(`  ${propertyCounts[1]} contacts with 1 property`);
  console.log(`  ${propertyCounts[2]} contacts with 2 properties`);

  // Validate properties
  const sampleProperties = generatePropertiesForContact('test_contact');
  let propertiesValid = 0;
  for (const property of sampleProperties) {
    try {
      validator.validateProperty(property);
      propertiesValid++;
    } catch (error) {
      logger.error('Property validation failed', error.message);
    }
  }

  if (propertiesValid === sampleProperties.length) {
    logger.success('All properties passed validation!');
  }
  console.log('');

  // Test 5: Email uniqueness
  logger.info('Test 5: Email uniqueness check');
  const emails = new Set(contacts.map((c) => c.email));
  if (emails.size === contacts.length) {
    logger.success(`All ${contacts.length} emails are unique!`);
  } else {
    logger.failure(
      `Found ${contacts.length - emails.size} duplicate emails!`
    );
  }
  console.log('');

  // Test 6: Geographic diversity
  logger.info('Test 6: Geographic diversity');
  const states = new Set(contacts.map((c) => c.address.state));
  const cities = new Set(contacts.map((c) => c.address.city));
  console.log(`  ${states.size} unique states`);
  console.log(`  ${cities.size} unique cities`);

  if (states.size >= 20 && cities.size >= 50) {
    logger.success('Geographic diversity is good!');
  } else {
    logger.warn('Geographic diversity could be better');
  }
  console.log('');

  logger.success('=== All generator tests completed! ===');
}

// Run tests
testGenerators().catch((error) => {
  logger.error('Generator test failed', error);
  process.exit(1);
});
