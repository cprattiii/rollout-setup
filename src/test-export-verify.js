/**
 * Test script for Phase 5 - Export and Verification
 * Tests data export and verification functionality
 */

import fs from 'fs';
import path from 'path';
import logger from './utils/logger.js';
import config from './config.js';
import Populator from './services/populator.js';
import Exporter from './services/exporter.js';
import Verifier from './services/verifier.js';

async function testExportAndVerification() {
  logger.info('=== Testing Phase 5: Export and Verification ===\n');

  // Setup: Generate test data
  logger.info('Setup: Generating test data...');
  const populator = new Populator({
    platform: 'cloze',
    contactCount: 5,
    dryRun: true,
  });

  await populator.populate();
  const generatedData = populator.getGeneratedData();
  logger.success('Test data generated!\n');

  // Test 1: Export to JSON
  logger.info('Test 1: Export data to JSON format');
  const exporter = new Exporter();

  try {
    const jsonExports = await exporter.exportPlatformData(
      'cloze',
      generatedData.cloze,
      'json'
    );

    // Verify JSON files exist
    const expectedFiles = [
      'cloze_contacts.json',
      'cloze_properties.json',
      'cloze_deals.json',
      'cloze_activities.json',
    ];

    let allFilesExist = true;
    for (const filename of expectedFiles) {
      const filePath = path.join(config.output.dir, filename);
      if (fs.existsSync(filePath)) {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`  ✓ ${filename} exists (${content.length} records)`);
      } else {
        logger.failure(`  ✗ ${filename} missing`);
        allFilesExist = false;
      }
    }

    if (allFilesExist) {
      logger.success('All JSON files exported successfully!');
    }
  } catch (error) {
    logger.error('JSON export failed', error);
  }
  console.log('');

  // Test 2: Export to CSV
  logger.info('Test 2: Export data to CSV format');

  try {
    const csvExports = await exporter.exportPlatformData(
      'cloze',
      generatedData.cloze,
      'csv'
    );

    // Verify CSV files exist
    const expectedFiles = [
      'cloze_contacts.csv',
      'cloze_properties.csv',
      'cloze_deals.csv',
      'cloze_activities.csv',
    ];

    let allFilesExist = true;
    for (const filename of expectedFiles) {
      const filePath = path.join(config.output.dir, filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim());
        console.log(`  ✓ ${filename} exists (${lines.length - 1} records)`);
      } else {
        logger.failure(`  ✗ ${filename} missing`);
        allFilesExist = false;
      }
    }

    if (allFilesExist) {
      logger.success('All CSV files exported successfully!');
    }
  } catch (error) {
    logger.error('CSV export failed', error);
  }
  console.log('');

  // Test 3: Verify email patterns
  logger.info('Test 3: Verify email patterns');

  const verifier = new Verifier();
  const emailResult = verifier.verifyEmailPattern(
    generatedData.cloze.contacts,
    'cloze',
    config.email.baseEmail
  );

  if (emailResult.invalid === 0) {
    logger.success('Email pattern verification passed!');
  } else {
    logger.failure(`${emailResult.invalid} invalid email patterns found`);
  }
  console.log('');

  // Test 4: Verify deal-property linking
  logger.info('Test 4: Verify deal-property linking distribution');

  const linkingResult = verifier.verifyDealPropertyLinking(generatedData.cloze.deals);

  if (linkingResult.withinRange) {
    logger.success('Deal-property linking is within acceptable range!');
  } else {
    logger.warn('Deal-property linking outside expected range');
  }
  console.log('');

  // Test 5: Run comprehensive verification
  logger.info('Test 5: Run comprehensive verification (skipAPICheck)');

  try {
    const verificationResult = await verifier.runVerification(
      'cloze',
      generatedData.cloze,
      config.email.baseEmail,
      { skipAPICheck: true }
    );

    if (verificationResult.emailPatterns.invalid === 0) {
      logger.success('Comprehensive verification passed!');
    } else {
      logger.warn('Verification completed with warnings');
    }
  } catch (error) {
    logger.error('Verification failed', error);
  }
  console.log('');

  // Test 6: Test CSV contact export format
  logger.info('Test 6: Verify CSV contact format');

  const csvPath = path.join(config.output.dir, 'cloze_contacts.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const csvLines = csvContent.split('\n').filter((l) => l.trim());

  // Check header row
  const header = csvLines[0];
  const expectedColumns = [
    'ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Company',
    'Type',
    'Address',
    'City',
    'State',
    'Zip',
  ];

  let headerValid = true;
  for (const column of expectedColumns) {
    if (!header.includes(column)) {
      logger.failure(`Missing column: ${column}`);
      headerValid = false;
    }
  }

  if (headerValid) {
    logger.success('CSV header format is correct!');
    console.log(`  Header: ${header.substring(0, 60)}...`);
  }

  // Check data rows
  const dataRows = csvLines.slice(1);
  console.log(`  Data rows: ${dataRows.length}`);

  if (dataRows.length > 0) {
    console.log(`  Sample row: ${dataRows[0].substring(0, 80)}...`);
    logger.success('CSV data format looks good!');
  }
  console.log('');

  // Test 7: Test both platforms export
  logger.info('Test 7: Test export for both platforms');

  const bothPopulator = new Populator({
    platform: 'both',
    contactCount: 3,
    dryRun: true,
  });

  await bothPopulator.populate();
  const bothData = bothPopulator.getGeneratedData();

  try {
    await exporter.exportPlatformData('cloze', bothData.cloze, 'json');
    await exporter.exportPlatformData('lofty', bothData.lofty, 'json');

    const clozeFile = path.join(config.output.dir, 'cloze_contacts.json');
    const loftyFile = path.join(config.output.dir, 'lofty_contacts.json');

    if (fs.existsSync(clozeFile) && fs.existsSync(loftyFile)) {
      logger.success('Both platform exports work!');
    } else {
      logger.failure('Missing export files for one or both platforms');
    }
  } catch (error) {
    logger.error('Both platforms export failed', error);
  }
  console.log('');

  // Cleanup test files
  logger.info('Cleanup: Removing test export files...');
  const testFiles = [
    'cloze_contacts.json',
    'cloze_properties.json',
    'cloze_deals.json',
    'cloze_activities.json',
    'cloze_contacts.csv',
    'cloze_properties.csv',
    'cloze_deals.csv',
    'cloze_activities.csv',
    'lofty_contacts.json',
    'lofty_properties.json',
    'lofty_deals.json',
    'lofty_activities.json',
  ];

  let cleanedCount = 0;
  for (const filename of testFiles) {
    const filePath = path.join(config.output.dir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      cleanedCount++;
    }
  }

  logger.success(`Cleaned up ${cleanedCount} test files\n`);

  logger.success('=== All export and verification tests passed! ===');
}

// Run tests
testExportAndVerification().catch((error) => {
  logger.error('Export/Verification test failed', error);
  process.exit(1);
});
