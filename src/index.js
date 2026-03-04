#!/usr/bin/env node

/**
 * Main entry point for rollout setup
 * Parses command-line arguments and runs population
 */

import { parseArgs } from 'util';
import config, { validateConfig } from './config.js';
import logger from './utils/logger.js';
import Populator from './services/populator.js';
import Exporter from './services/exporter.js';
import Verifier from './services/verifier.js';

// Parse command-line arguments
function parseArguments() {
  try {
    const { values } = parseArgs({
      options: {
        platform: {
          type: 'string',
          short: 'p',
          default: 'both',
        },
        count: {
          type: 'string',
          short: 'c',
          default: String(config.population.contactCount),
        },
        'dry-run': {
          type: 'boolean',
          default: false,
        },
        verify: {
          type: 'boolean',
          default: false,
        },
        export: {
          type: 'string',
          short: 'e',
          default: 'both',
        },
        help: {
          type: 'boolean',
          short: 'h',
          default: false,
        },
      },
    });

    return {
      platform: values.platform,
      count: parseInt(values.count),
      dryRun: values['dry-run'],
      verify: values.verify,
      export: values.export,
      help: values.help,
    };
  } catch (error) {
    logger.error('Failed to parse arguments', error.message);
    printHelp();
    process.exit(1);
  }
}

// Print help message
function printHelp() {
  console.log(`
Rollout Setup - Test Data Population for Cloze/Lofty Integration

Usage:
  node src/index.js [options]

Options:
  -p, --platform <name>    Platform to populate: cloze, lofty, or both (default: both)
  -c, --count <number>     Number of contacts to generate (default: 1000)
  --dry-run                Generate data without making API calls
  --verify                 Run verification after population (default: false)
  -e, --export <format>    Export format: json, csv, or both (default: both)
  -h, --help               Show this help message

Examples:
  # Populate both platforms with 1000 contacts
  node src/index.js

  # Populate only Cloze with 100 contacts
  node src/index.js --platform cloze --count 100

  # Dry run (no API calls)
  node src/index.js --dry-run

  # Populate and verify
  node src/index.js --verify

Environment Variables:
  Configure via .env file (see .env.example)
  - CLOZE_API_KEY: Cloze API key (required)
  - LOFTY_API_KEY: Lofty API key (required)
  - BASE_EMAIL: Base email address (default: carl.pratt@constantcontact.com)
  - CONTACT_COUNT: Number of contacts (default: 1000)
  - BATCH_SIZE: Batch size for rate limiting (default: 10)
  - BATCH_DELAY_MS: Delay between batches in ms (default: 200)
  - MAX_CONCURRENT: Max concurrent requests (default: 3)
  - MAX_RETRIES: Max retry attempts (default: 5)

For more information, see README.md
`);
}

// Main function
async function main() {
  const args = parseArguments();

  // Show help if requested
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Validate platform
  if (!['cloze', 'lofty', 'both'].includes(args.platform)) {
    logger.error('Invalid platform. Must be: cloze, lofty, or both');
    process.exit(1);
  }

  // Validate count
  if (args.count < 1 || args.count > 10000) {
    logger.error('Count must be between 1 and 10000');
    process.exit(1);
  }

  // Validate export format
  if (!['json', 'csv', 'both'].includes(args.export)) {
    logger.error('Invalid export format. Must be: json, csv, or both');
    process.exit(1);
  }

  try {
    // Validate configuration (unless dry run)
    if (!args.dryRun) {
      logger.info('Validating configuration...');
      validateConfig();
      logger.success('Configuration is valid');
    } else {
      logger.info('Running in DRY RUN mode (no API calls will be made)');
    }

    // Create populator
    const populator = new Populator({
      platform: args.platform,
      contactCount: args.count,
      dryRun: args.dryRun,
    });

    // Run population
    await populator.populate();

    // Export data if requested
    if (args.export && args.export !== 'none') {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info('EXPORTING DATA');
      logger.info('='.repeat(60));

      const exporter = new Exporter();
      const generatedData = populator.getGeneratedData();

      if (args.platform === 'both' || args.platform === 'cloze') {
        await exporter.exportPlatformData('cloze', generatedData.cloze, args.export);
      }

      if (args.platform === 'both' || args.platform === 'lofty') {
        await exporter.exportPlatformData('lofty', generatedData.lofty, args.export);
      }

      logger.success('\n✅ Data export completed successfully!');
    }

    // Run verification if requested
    if (args.verify) {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info('VERIFYING DATA');
      logger.info('='.repeat(60));

      const verifier = new Verifier();
      const generatedData = populator.getGeneratedData();

      // Skip API checks in dry-run mode
      const skipAPICheck = args.dryRun;

      if (args.platform === 'both' || args.platform === 'cloze') {
        await verifier.runVerification(
          'cloze',
          generatedData.cloze,
          config.email.baseEmail,
          { skipAPICheck }
        );
      }

      if (args.platform === 'both' || args.platform === 'lofty') {
        await verifier.runVerification(
          'lofty',
          generatedData.lofty,
          config.email.baseEmail,
          { skipAPICheck }
        );
      }

      logger.success('\n✅ Verification completed!');
    }

    logger.success('\n✅ Rollout setup completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('\n❌ Rollout setup failed', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
main();
