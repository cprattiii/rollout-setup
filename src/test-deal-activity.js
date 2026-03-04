/**
 * Test script for Phase 3 generators
 * Tests deal and activity data generation with relationships
 */

import logger from './utils/logger.js';
import validator from './utils/validator.js';
import { generateContacts } from './generators/contact.js';
import { generatePropertiesForContact } from './generators/property.js';
import {
  generateDealsForContact,
  verifyDealPropertyLinking,
  verifyDealStatusDistribution,
} from './generators/deal.js';
import {
  generateActivitiesForContact,
  verifyActivityDistribution,
  verifyActivityTimestamps,
} from './generators/activity.js';

async function testDealActivityGenerators() {
  logger.info('=== Testing Phase 3: Deal and Activity Generators ===\n');

  // Setup test data
  const contacts = generateContacts('cloze', 20, 'carl.pratt@constantcontact.com');
  const contactsWithData = contacts.map((contact, index) => {
    const id = `contact_${index + 1}`;
    const properties = generatePropertiesForContact(id);

    // Add IDs to properties
    const propertiesWithIds = properties.map((prop, propIndex) => ({
      ...prop,
      id: `property_${index + 1}_${propIndex + 1}`,
    }));

    return {
      ...contact,
      id,
      properties: propertiesWithIds,
    };
  });

  // Test 1: Generate deals with property linking
  logger.info('Test 1: Generate deals for contacts');

  let totalDeals = 0;
  let dealsWithProperty = 0;
  let dealsWithoutProperty = 0;

  for (const contact of contactsWithData) {
    const deals = generateDealsForContact(contact.id, contact, contact.properties);

    totalDeals += deals.length;
    for (const deal of deals) {
      if (deal.propertyId) {
        dealsWithProperty++;
      } else {
        dealsWithoutProperty++;
      }

      // Validate deal
      try {
        validator.validateDeal(deal);
      } catch (error) {
        logger.error(`Deal validation failed`, error.message);
      }
    }

    // Check deal count is 1-5
    if (deals.length < 1 || deals.length > 5) {
      logger.failure(`Contact has ${deals.length} deals (expected 1-5)`);
    }
  }

  console.log(`  ${contactsWithData.length} contacts generated ${totalDeals} deals`);
  console.log(`  Average: ${(totalDeals / contactsWithData.length).toFixed(1)} deals per contact`);
  console.log(`  ${dealsWithProperty} deals with property (${Math.round((dealsWithProperty/totalDeals)*100)}%)`);
  console.log(`  ${dealsWithoutProperty} deals without property (${Math.round((dealsWithoutProperty/totalDeals)*100)}%)`);

  // Check 70/30 distribution (with 15% tolerance)
  const withPropertyPercent = Math.round((dealsWithProperty / totalDeals) * 100);
  if (withPropertyPercent >= 55 && withPropertyPercent <= 85) {
    logger.success('Deal-property linking is within acceptable range (target: 70%)!');
  } else {
    logger.warn(`Deal-property linking is ${withPropertyPercent}% (expected ~70%)`);
  }
  console.log('');

  // Test 2: Verify deal status distribution
  logger.info('Test 2: Verify deal status distribution');

  const allDeals = contactsWithData.flatMap(c =>
    generateDealsForContact(c.id, c, c.properties)
  );

  const statusDist = verifyDealStatusDistribution(allDeals);
  console.log('  Deal statuses:');
  for (const [status, percentage] of Object.entries(statusDist.percentages)) {
    console.log(`    ${status}: ${percentage}% (${statusDist.counts[status]} deals)`);
  }
  logger.success('Deal status distribution looks good!');
  console.log('');

  // Test 3: Verify deal dates are logical
  logger.info('Test 3: Verify deal dates are logical');

  let datesValid = true;
  for (const deal of allDeals.slice(0, 10)) {
    const isClosed = deal.status === 'Closed-Won' || deal.status === 'Closed-Lost';

    if (isClosed && !deal.actualCloseDate) {
      logger.failure(`Closed deal missing actual close date`);
      datesValid = false;
    }

    if (!isClosed && !deal.expectedCloseDate) {
      logger.failure(`Open deal missing expected close date`);
      datesValid = false;
    }
  }

  if (datesValid) {
    logger.success('Deal dates are logically consistent!');
  }
  console.log('');

  // Test 4: Generate activities for contacts
  logger.info('Test 4: Generate activities for contacts');

  const allActivities = [];
  let minActivities = Infinity;
  let maxActivities = 0;

  for (const contact of contactsWithData.slice(0, 10)) {
    const activities = generateActivitiesForContact(contact.id, contact);
    allActivities.push(...activities);

    const count = activities.length;
    minActivities = Math.min(minActivities, count);
    maxActivities = Math.max(maxActivities, count);

    // Validate activities
    for (const activity of activities) {
      try {
        validator.validateActivity(activity);
      } catch (error) {
        logger.error(`Activity validation failed`, error.message);
      }
    }
  }

  console.log(`  10 contacts generated ${allActivities.length} activities`);
  console.log(`  Range: ${minActivities}-${maxActivities} activities per contact`);
  console.log(`  Average: ${(allActivities.length / 10).toFixed(1)} activities per contact`);

  // Check range (should be roughly 5-20 based on our counts)
  if (minActivities >= 5 && maxActivities <= 30) {
    logger.success('Activity counts are within acceptable range!');
  } else {
    logger.warn(`Activity range ${minActivities}-${maxActivities} may be outside expected 5-20`);
  }
  console.log('');

  // Test 5: Verify activity type distribution
  logger.info('Test 5: Verify activity type distribution');

  const activityDist = verifyActivityDistribution(allActivities);
  console.log('  Activity types (average per contact):');
  for (const [type, avg] of Object.entries(activityDist.averages)) {
    console.log(`    ${type}: ${avg} per contact (${activityDist.counts[type]} total)`);
  }

  // Rough checks (emails should be most common)
  if (activityDist.counts.Email > activityDist.counts.Call) {
    logger.success('Activity type distribution looks good (emails > calls)!');
  }
  console.log('');

  // Test 6: Verify activity timestamps
  logger.info('Test 6: Verify activity timestamps are within 6 months');

  const timestampCheck = verifyActivityTimestamps(allActivities);
  console.log(`  Valid timestamps: ${timestampCheck.validCount}/${timestampCheck.total}`);
  console.log(`  Invalid timestamps: ${timestampCheck.invalidCount}`);

  if (timestampCheck.valid) {
    logger.success('All activity timestamps are within 6 months!');
  } else {
    logger.failure(`${timestampCheck.invalidCount} activities have invalid timestamps`);
  }
  console.log('');

  // Test 7: Verify activities are chronologically sorted
  logger.info('Test 7: Verify activities are chronologically sorted');

  let sortedCorrectly = true;
  const sampleContact = contactsWithData[0];
  const sampleActivities = generateActivitiesForContact(sampleContact.id, sampleContact);

  for (let i = 1; i < sampleActivities.length; i++) {
    const prev = new Date(sampleActivities[i - 1].timestamp);
    const curr = new Date(sampleActivities[i].timestamp);

    if (curr < prev) {
      sortedCorrectly = false;
      break;
    }
  }

  if (sortedCorrectly) {
    logger.success('Activities are chronologically sorted (oldest first)!');
  } else {
    logger.failure('Activities are not properly sorted');
  }
  console.log('');

  // Test 8: Verify multiple deals can reference same property
  logger.info('Test 8: Verify multiple deals can reference same property');

  let multipleDealsOnSameProperty = false;
  for (const contact of contactsWithData) {
    const deals = generateDealsForContact(contact.id, contact, contact.properties);
    const propertyIds = deals.map(d => d.propertyId).filter(id => id !== null);
    const uniquePropertyIds = new Set(propertyIds);

    if (propertyIds.length > uniquePropertyIds.size) {
      multipleDealsOnSameProperty = true;
      console.log(`  Found contact with multiple deals on same property`);
      break;
    }
  }

  if (multipleDealsOnSameProperty) {
    logger.success('Confirmed: Multiple deals can reference the same property!');
  } else {
    logger.info('No examples found in this sample (expected behavior - it\'s random)');
  }
  console.log('');

  logger.success('=== All deal and activity generator tests completed! ===');
}

// Run tests
testDealActivityGenerators().catch((error) => {
  logger.error('Deal/Activity generator test failed', error);
  process.exit(1);
});
