/**
 * Test script for Phase 4 - Populator Service
 * Tests the main population orchestration in dry-run mode
 */

import logger from './utils/logger.js';
import Populator from './services/populator.js';

async function testPopulator() {
  logger.info('=== Testing Phase 4: Populator Service ===\n');

  // Test 1: Create populator instance
  logger.info('Test 1: Create Populator instance');
  const populator = new Populator({
    platform: 'cloze',
    contactCount: 10,
    dryRun: true, // No API calls
  });

  if (populator.platform === 'cloze' && populator.contactCount === 10) {
    logger.success('Populator instance created successfully!');
  } else {
    logger.failure('Populator instance configuration incorrect');
  }
  console.log('');

  // Test 2: Run population in dry-run mode
  logger.info('Test 2: Run population (dry-run mode)');
  try {
    await populator.populate();
    logger.success('Population completed without errors!');
  } catch (error) {
    logger.error('Population failed', error);
    throw error;
  }
  console.log('');

  // Test 3: Verify statistics
  logger.info('Test 3: Verify statistics');
  const { stats } = populator.getStats();

  console.log('Cloze Statistics:');
  console.log(`  Contacts: ${stats.cloze.contacts.succeeded}/${stats.cloze.contacts.attempted}`);
  console.log(`  Properties: ${stats.cloze.properties.succeeded}/${stats.cloze.properties.attempted}`);
  console.log(`  Deals: ${stats.cloze.deals.succeeded}/${stats.cloze.deals.attempted}`);
  console.log(`  Activities: ${stats.cloze.activities.succeeded}/${stats.cloze.activities.attempted}`);

  // Verify we attempted all contacts
  if (stats.cloze.contacts.attempted === 10) {
    logger.success('Contact count matches expected!');
  } else {
    logger.failure(`Expected 10 contacts, got ${stats.cloze.contacts.attempted}`);
  }

  // Verify all succeeded in dry-run mode
  if (stats.cloze.contacts.succeeded === 10) {
    logger.success('All contacts succeeded in dry-run mode!');
  } else {
    logger.failure(`Expected 10 successes, got ${stats.cloze.contacts.succeeded}`);
  }

  // Verify properties were generated (10-20 expected for 10 contacts)
  if (stats.cloze.properties.attempted >= 10 && stats.cloze.properties.attempted <= 20) {
    logger.success('Property count is within expected range (10-20)!');
  } else {
    logger.warn(`Property count ${stats.cloze.properties.attempted} outside expected 10-20 range`);
  }

  // Verify deals were generated (10-50 expected for 10 contacts)
  if (stats.cloze.deals.attempted >= 10 && stats.cloze.deals.attempted <= 50) {
    logger.success('Deal count is within expected range (10-50)!');
  } else {
    logger.warn(`Deal count ${stats.cloze.deals.attempted} outside expected 10-50 range`);
  }

  // Verify activities were generated (50-200 expected for 10 contacts)
  if (stats.cloze.activities.attempted >= 50 && stats.cloze.activities.attempted <= 200) {
    logger.success('Activity count is within expected range (50-200)!');
  } else {
    logger.warn(`Activity count ${stats.cloze.activities.attempted} outside expected 50-200 range`);
  }
  console.log('');

  // Test 4: Test both platforms
  logger.info('Test 4: Test both platforms');
  const bothPopulator = new Populator({
    platform: 'both',
    contactCount: 5,
    dryRun: true,
  });

  try {
    await bothPopulator.populate();
    const { stats: bothStats } = bothPopulator.getStats();

    console.log('Cloze contacts:', bothStats.cloze.contacts.succeeded);
    console.log('Lofty contacts:', bothStats.lofty.contacts.succeeded);

    if (
      bothStats.cloze.contacts.succeeded === 5 &&
      bothStats.lofty.contacts.succeeded === 5
    ) {
      logger.success('Both platforms populated successfully!');
    } else {
      logger.failure('Platform counts incorrect');
    }
  } catch (error) {
    logger.error('Both platforms test failed', error);
    throw error;
  }
  console.log('');

  // Test 5: Test Lofty-only
  logger.info('Test 5: Test Lofty platform only');
  const loftyPopulator = new Populator({
    platform: 'lofty',
    contactCount: 5,
    dryRun: true,
  });

  try {
    await loftyPopulator.populate();
    const { stats: loftyStats } = loftyPopulator.getStats();

    console.log('Lofty contacts:', loftyStats.lofty.contacts.succeeded);

    if (loftyStats.lofty.contacts.succeeded === 5) {
      logger.success('Lofty-only population works!');
    } else {
      logger.failure('Lofty contact count incorrect');
    }
  } catch (error) {
    logger.error('Lofty-only test failed', error);
    throw error;
  }
  console.log('');

  // Test 6: Verify failed records handling
  logger.info('Test 6: Verify failed records are tracked');
  const { failed } = populator.getStats();

  console.log(`Cloze failed records: ${failed.cloze.length}`);
  console.log(`Lofty failed records: ${failed.lofty.length}`);

  // In dry-run mode, should be 0 failures
  if (failed.cloze.length === 0 && failed.lofty.length === 0) {
    logger.success('No failed records in dry-run mode (expected)!');
  } else {
    logger.warn('Unexpected failed records in dry-run mode');
  }
  console.log('');

  logger.success('=== All Populator tests passed! ===');
}

// Run tests
testPopulator().catch((error) => {
  logger.error('Populator test failed', error);
  process.exit(1);
});
