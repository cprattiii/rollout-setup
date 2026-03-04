import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

export const config = {
  cloze: {
    apiKey: process.env.CLOZE_API_KEY,
    baseUrl: process.env.CLOZE_API_BASE_URL || 'https://api.cloze.com/v1',
  },
  lofty: {
    apiKey: process.env.LOFTY_API_KEY,
    baseUrl: process.env.LOFTY_API_BASE_URL || 'https://api.lofty.com/v1',
  },
  email: {
    baseEmail: process.env.BASE_EMAIL || 'carl.pratt@constantcontact.com',
  },
  population: {
    contactCount: parseInt(process.env.CONTACT_COUNT) || 1000,
    batchSize: parseInt(process.env.BATCH_SIZE) || 10,
    batchDelayMs: parseInt(process.env.BATCH_DELAY_MS) || 200,
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT) || 3,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 5,
  },
  output: {
    dir: process.env.OUTPUT_DIR || './output',
  },
};

// Validation
export function validateConfig() {
  const errors = [];

  if (!config.cloze.apiKey) {
    errors.push('CLOZE_API_KEY is required');
  }

  if (!config.lofty.apiKey) {
    errors.push('LOFTY_API_KEY is required');
  }

  if (!config.email.baseEmail || !config.email.baseEmail.includes('@')) {
    errors.push('BASE_EMAIL must be a valid email address');
  }

  if (config.population.contactCount < 1 || config.population.contactCount > 10000) {
    errors.push('CONTACT_COUNT must be between 1 and 10000');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

export default config;
