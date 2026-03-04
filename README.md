# Rollout Setup - Test Data Population

Automated test data generation and population tool for Cloze/Lofty CRM integration testing.

## Overview

This tool generates realistic real estate CRM data (contacts, properties, deals, activities) and populates it into Cloze and Lofty platforms via their APIs. It supports dry-run mode, rate limiting, data export, and verification.

## Features

- **Realistic Data Generation**: Uses Faker.js to generate authentic-looking contacts, properties, deals, and activities
- **Dual Platform Support**: Populates data to Cloze and/or Lofty
- **Rate Limiting**: Configurable batch processing with delays and retry logic
- **Dry Run Mode**: Test without making API calls
- **Data Export**: Export generated data to JSON and CSV formats
- **Verification**: Validate email patterns, deal-property linking, and API data
- **Error Handling**: Exponential backoff retry with detailed error logging
- **Progress Tracking**: Real-time progress and comprehensive summary reports

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file (see `.env.example`):

```env
# API Keys
CLOZE_API_KEY=your_cloze_api_key_here
LOFTY_API_KEY=your_lofty_api_key_here

# Email Configuration
BASE_EMAIL=carl.pratt@constantcontact.com

# Population Settings
CONTACT_COUNT=1000
BATCH_SIZE=10
BATCH_DELAY_MS=200
MAX_CONCURRENT=3
MAX_RETRIES=5
```

### Configuration Options

- **CLOZE_API_KEY**: Cloze platform API key (required for Cloze population)
- **LOFTY_API_KEY**: Lofty platform API key (required for Lofty population)
- **BASE_EMAIL**: Base email address for generating unique contact emails
  - Cloze contacts: `carl.pratt+cloze_0001@constantcontact.com` through `cloze_1000`
  - Lofty contacts: `carl.pratt+lofty_0001@constantcontact.com` through `lofty_1000`
- **CONTACT_COUNT**: Number of contacts to generate per platform (default: 1000)
- **BATCH_SIZE**: Number of items to process in each batch (default: 10)
- **BATCH_DELAY_MS**: Delay between batches in milliseconds (default: 200ms)
- **MAX_CONCURRENT**: Maximum concurrent API requests (default: 3)
- **MAX_RETRIES**: Maximum retry attempts for failed requests (default: 5)

## Usage

### Basic Commands

```bash
# Populate both platforms with 1000 contacts each
node src/index.js

# Populate only Cloze with 100 contacts
node src/index.js --platform cloze --count 100

# Populate only Lofty with 500 contacts
node src/index.js --platform lofty --count 500

# Dry run (no API calls, generates data only)
node src/index.js --dry-run

# Export data to JSON and CSV
node src/index.js --export both

# Run with verification
node src/index.js --verify

# Full workflow: populate, export, and verify
node src/index.js --export both --verify
```

### Command-Line Options

- `-p, --platform <name>` - Platform to populate: `cloze`, `lofty`, or `both` (default: both)
- `-c, --count <number>` - Number of contacts to generate (default: 1000, max: 10000)
- `--dry-run` - Generate data without making API calls (for testing)
- `--verify` - Run verification after population
- `-e, --export <format>` - Export format: `json`, `csv`, or `both` (default: both)
- `-h, --help` - Show help message

## Data Schema

### Contacts
- Full name, email, phone, company
- Address (street, city, state, zip)
- Contact type: Buyer (40%), Lead (30%), Seller (20%), Past Client (10%)
- Real estate custom fields (budget range, property preferences, etc.)
- Email subscription status: true

### Properties (1-2 per contact)
- Type: Residential, Commercial, Land
- Full address
- Price based on property type
- Residential properties include bedrooms, bathrooms, square feet

### Deals (1-5 per contact)
- Deal name and status
- Value (based on linked property or random)
- 70% linked to properties, 30% without property link
- Expected/actual close dates based on status
- Statuses: Prospect, Qualified, Under Contract, Closed-Won, Closed-Lost

### Activities (5-30 per contact)
- Types: Email (3-10), Call (1-5), Meeting (0-3), Note (2-8)
- Timestamps spread over last 6 months
- Context-aware subjects and descriptions
- Chronologically sorted (oldest first)

## Testing

```bash
# Test infrastructure (Phase 1)
node src/test-infrastructure.js

# Test data generators (Phase 2)
node src/test-generators.js

# Test deal and activity generators (Phase 3)
node src/test-deal-activity.js

# Test population service (Phase 4)
node src/test-populator.js

# Test export and verification (Phase 5)
node src/test-export-verify.js
```

## Output

### Generated Files

All output files are saved to the `output/` directory:

#### Data Exports
- `{platform}_contacts.json` / `.csv` - Contact records
- `{platform}_properties.json` / `.csv` - Property records
- `{platform}_deals.json` / `.csv` - Deal records
- `{platform}_activities.json` / `.csv` - Activity records

#### Error Tracking
- `failed_{platform}.json` - Failed records with error details

### Progress Reports

The tool provides detailed progress information:

```
============================================================
Starting population for CLOZE
============================================================

Generating 1000 contacts for cloze...
✅ Generated 1000 contacts

Populating contacts in cloze...
Processing 1000 items in 100 batches
✅ Successfully created 1000/1000 contacts

Populating properties for 1000 contacts...
  Generated 1478 properties
Processing 1478 items in 148 batches
...

============================================================
POPULATION SUMMARY
============================================================

CLOZE:
  Duration: 245.3 seconds
  Contacts: 1000/1000 (0 failed)
  Properties: 1478/1478 (0 failed)
  Deals: 2945/2945 (0 failed)
  Activities: 16234/16234 (0 failed)
  Success Rate: 100.0%

OVERALL:
  Total Duration: 245.3 seconds
============================================================

✅ Rollout setup completed successfully!
```

## Rate Limiting Strategy

The tool implements multiple layers of rate limiting to prevent API throttling:

1. **Batch Processing**: Items are processed in configurable batches
2. **Batch Delays**: Configurable delay between batches
3. **Concurrency Limits**: Maximum concurrent requests
4. **Exponential Backoff**: Automatic retry with increasing delays (1s, 2s, 4s, 8s)
5. **Max Retries**: Configurable maximum retry attempts

Default configuration processes ~50 items/second with built-in safety margins.

## Verification

The verification module checks:

- **Email Patterns**: Validates correct email format (platform_0001 through platform_1000)
- **Deal-Property Linking**: Verifies 70/30 distribution (±15% tolerance)
- **Sample Contacts**: Checks that contacts exist in platform API
- **Data Counts**: Retrieves count statistics from platform

Run verification with:
```bash
node src/index.js --verify --dry-run  # Verify without API checks
node src/index.js --verify            # Full verification including API
```

## Error Handling

- **Automatic Retries**: Failed requests retry with exponential backoff
- **Error Logging**: All errors logged with context and timestamps
- **Failed Records**: Saved to JSON files for troubleshooting
- **Graceful Degradation**: Continues processing after individual failures

## Development

### Project Structure

```
rollout-setup/
├── src/
│   ├── index.js                 # Main entry point
│   ├── config.js                # Configuration loader
│   ├── clients/
│   │   ├── cloze.js            # Cloze API client
│   │   └── lofty.js            # Lofty API client
│   ├── generators/
│   │   ├── contact.js          # Contact data generator
│   │   ├── property.js         # Property data generator
│   │   ├── deal.js             # Deal data generator
│   │   └── activity.js         # Activity data generator
│   ├── services/
│   │   ├── populator.js        # Main orchestration service
│   │   ├── rateLimit.js        # Rate limiting logic
│   │   ├── retry.js            # Retry with backoff
│   │   ├── exporter.js         # Data export service
│   │   └── verifier.js         # Verification service
│   ├── utils/
│   │   ├── logger.js           # Logging utility
│   │   └── validator.js        # Data validation
│   └── test-*.js               # Test suites
├── output/                      # Generated data files
├── .env                         # Environment configuration
├── package.json
└── README.md
```

### Adding New Data Types

1. Create generator in `src/generators/`
2. Add validation in `src/utils/validator.js`
3. Add client methods in `src/clients/`
4. Integrate into `src/services/populator.js`
5. Add tests in `src/test-*.js`

## API Endpoints

**Note**: API endpoints in client files are currently placeholders marked with `TODO`. You need to:

1. Obtain API documentation from Cloze and Lofty
2. Update endpoint URLs in `src/clients/cloze.js` and `src/clients/lofty.js`
3. Verify authentication methods
4. Test with small batches before full population

## Troubleshooting

### Common Issues

**Problem**: API authentication fails
- **Solution**: Verify API keys in `.env` file are correct

**Problem**: Rate limit errors
- **Solution**: Increase `BATCH_DELAY_MS` or decrease `BATCH_SIZE`

**Problem**: Memory issues with large datasets
- **Solution**: Reduce `CONTACT_COUNT` or `MAX_CONCURRENT`

**Problem**: Circular reference errors in JSON export
- **Solution**: Fixed in Phase 5 - ensure you have latest code

## License

This is an internal tool for Constant Contact integration testing.

## Support

For issues or questions, see the project specification in `codev/specs/2-rollout-setup.md`.
