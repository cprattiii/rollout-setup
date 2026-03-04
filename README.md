# Rollout Setup - Test Data Population

Automated tool to populate Cloze and Lofty CRM platforms with realistic test data for Constant Contact integration testing.

## Overview

This tool generates and populates 1000 realistic contacts in each CRM platform (Cloze and Lofty), including:
- Full contact profiles (name, email, phone, address)
- Properties (1-2 per contact)
- Deals/Transactions (1-5 per contact)
- Activities (emails, calls, meetings, notes)

## Prerequisites

- Node.js v18 or higher
- API keys for both Cloze and Lofty
- API documentation for both platforms

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env`:
```bash
CLOZE_API_KEY=your_actual_cloze_key
LOFTY_API_KEY=your_actual_lofty_key
```

### 3. Complete API Research

**IMPORTANT**: Before running population, you must complete the API research in `docs/api-research.md`:
- Document actual API endpoints
- Test authentication with both APIs
- Create one test contact in each platform
- Verify data appears in dashboards

See `docs/api-research.md` for detailed checklist.

### 4. Run Population

```bash
# Dry run (generate data without API calls)
npm run dry-run

# Populate both platforms
npm run populate

# Populate only Cloze
npm run populate:cloze

# Populate only Lofty
npm run populate:lofty
```

## Command Line Options

```bash
node src/index.js [options]

Options:
  --platform <name>    Platform to populate: cloze, lofty, or both (default: both)
  --count <number>     Number of contacts to generate (default: 1000)
  --export <format>    Export format: json, csv, or both (default: both)
  --verify             Run verification after population (default: true)
  --dry-run            Generate data without making API calls
  --help               Show help message
```

## Project Structure

```
rollout-setup/
├── src/
│   ├── index.js              # Main entry point
│   ├── config.js             # Configuration loader
│   ├── generators/           # Data generation modules
│   │   ├── contact.js
│   │   ├── property.js
│   │   ├── deal.js
│   │   └── activity.js
│   ├── clients/              # API client modules
│   │   ├── cloze.js
│   │   └── lofty.js
│   ├── services/             # Core services
│   │   ├── populator.js
│   │   ├── rateLimit.js
│   │   ├── retry.js
│   │   └── verifier.js
│   ├── exporters/            # Data export modules
│   │   ├── json.js
│   │   └── csv.js
│   └── utils/                # Utility functions
│       ├── logger.js
│       └── validator.js
├── output/                   # Generated data files
├── docs/                     # Documentation
│   └── api-research.md
└── package.json
```

## Data Schema

### Email Address Patterns

- **Cloze**: `carl.pratt+cloze_01@constantcontact.com` through `carl.pratt+cloze_1000@constantcontact.com`
- **Lofty**: `carl.pratt+lofty_01@constantcontact.com` through `carl.pratt+lofty_1000@constantcontact.com`

Numbers are zero-padded (01, 02, ..., 99, 100, ..., 1000).

### Contact Types Distribution

- 40% Buyers
- 30% Leads
- 20% Sellers
- 10% Past Clients

### Relationships

- Each contact has 1-2 properties
- Each contact has 1-5 deals
- 70% of deals reference a property
- 30% of deals have no property
- Each contact has 5-20 activities

## Output Files

After population, you'll find in `output/`:

- `cloze_contacts.json` - All Cloze data (JSON format)
- `lofty_contacts.json` - All Lofty data (JSON format)
- `cloze_contacts.csv` - Cloze contacts (CSV format)
- `lofty_contacts.csv` - Lofty contacts (CSV format)
- `failed_cloze.json` - Failed records for Cloze (if any)
- `failed_lofty.json` - Failed records for Lofty (if any)

## Rate Limiting

The tool implements careful rate limiting to avoid API throttling:

- **Batch Size**: 10 records per batch
- **Batch Delay**: 200ms between batches
- **Max Concurrent**: 3 simultaneous API calls
- **Retry Logic**: Exponential backoff (1s, 2s, 4s, 8s)
- **Max Retries**: 5 attempts per failed request

## Troubleshooting

### "Configuration validation failed"
- Check that `.env` file exists and has valid values
- Ensure API keys are set
- Verify BASE_EMAIL is a valid email address

### "API authentication failed"
- Verify API keys are correct
- Check that keys have proper permissions
- Review API documentation for auth requirements

### "Rate limit exceeded"
- Increase BATCH_DELAY_MS in `.env`
- Decrease BATCH_SIZE in `.env`
- Decrease MAX_CONCURRENT in `.env`

### "Contact creation failed"
- Check API endpoint URLs in `src/clients/`
- Verify request body matches API schema
- Review error logs for specific API errors

## Development Status

**Current Phase**: Phase 0 - API Research and Setup
**Status**: ⏳ Awaiting API documentation and keys

**Next Steps**:
1. User provides API keys and documentation
2. Complete API research and testing
3. Implement API clients (Phase 1)
4. Implement data generators (Phases 2-3)
5. Implement population service (Phase 4)
6. Implement export and verification (Phase 5)

## Support

For issues or questions:
1. Check `docs/api-research.md` for API requirements
2. Review error logs in console output
3. Check `output/failed_*.json` for failed records

## License

ISC
