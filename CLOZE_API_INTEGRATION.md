# Cloze API Integration Guide

## Overview

**Official Documentation**: https://developer.cloze.com/
**OpenAPI Specification**: https://developer.cloze.com/swagger.json
**Base URL**: `https://api.cloze.com`
**API Version**: v2026.2

## Authentication

Cloze supports two authentication methods:

### 1. API Key (Recommended for Development/Testing)

```javascript
// As query parameter
GET https://api.cloze.com/v1/people?api_key=YOUR_API_KEY

// As Bearer token (recommended)
Authorization: Bearer YOUR_API_KEY
```

**Get API Key**: https://help.cloze.com/article/2176-api-key

### 2. OAuth 2.0 (Required for Public Integrations)

Contact support@cloze.com for OAuth setup.

## Key Concepts

Cloze uses a generic data model with:
- **Stages**: Pipeline stages for deals/opportunities
- **Segments**: Contact categorization
- **Steps**: Workflow steps
- **Custom Fields**: Schemaless data storage (no UI configuration required)

## Required API Endpoints

Based on the Cloze API structure, here are the endpoints to implement:

### 1. People (Contacts)

#### Create/Update Person
```
PUT /v1/people
```

**Request Body**:
```json
{
  "name": "John Smith",
  "emails": [
    {
      "email": "carl.pratt+cloze_0001@constantcontact.com",
      "type": "work"
    }
  ],
  "phones": [
    {
      "phone": "(555) 123-4567",
      "type": "mobile"
    }
  ],
  "addresses": [
    {
      "street": "123 Main St",
      "city": "Boston",
      "state": "MA",
      "zip": "02101",
      "type": "work"
    }
  ],
  "company": "Example Company",
  "customFields": {
    "contactType": "Buyer",
    "budgetRange": "$400k-$600k",
    "propertyPreferences": "Single Family",
    "emailSubscribed": true
  }
}
```

**Response**:
```json
{
  "id": "person_abc123",
  "name": "John Smith",
  ...
}
```

#### Get Person
```
GET /v1/people/{personId}?api_key=YOUR_KEY
```

### 2. Projects (Deals/Opportunities)

Cloze uses "Projects" for deals and opportunities.

#### Create/Update Project
```
PUT /v1/project
```

**Request Body**:
```json
{
  "name": "123 Main St - Purchase",
  "people": ["person_abc123"],  // Link to contact
  "stage": "qualified",  // or "prospect", "under-contract", "closed-won", "closed-lost"
  "value": 450000,
  "expectedCloseDate": "2026-06-15T00:00:00Z",
  "customFields": {
    "propertyId": "prop_xyz789",  // Link to property via custom field
    "dealType": "Purchase"
  }
}
```

**Response**:
```json
{
  "id": "project_def456",
  "name": "123 Main St - Purchase",
  ...
}
```

#### Get Project
```
GET /v1/project/{projectId}?api_key=YOUR_KEY
```

### 3. Properties

Properties in Cloze are typically stored as custom fields on Projects or as separate entities. We have two options:

#### Option A: Store as Custom Fields on Projects
```json
{
  "customFields": {
    "propertyAddress": "123 Main St, Boston, MA 02101",
    "propertyType": "Residential",
    "propertyPrice": 450000,
    "bedrooms": 3,
    "bathrooms": 2.5,
    "squareFeet": 2200
  }
}
```

#### Option B: Create Separate Project for Each Property
```
PUT /v1/project
```
```json
{
  "name": "Property: 123 Main St",
  "people": ["person_abc123"],
  "customFields": {
    "entityType": "property",
    "address": "123 Main St",
    "city": "Boston",
    "state": "MA",
    "zip": "02101",
    "type": "Residential",
    "price": 450000,
    "bedrooms": 3,
    "bathrooms": 2.5,
    "squareFeet": 2200
  }
}
```

**Recommendation**: Use Option B (separate projects) for better organization and linking.

### 4. Activities/Notes

#### Create Note
```
PUT /v1/note
```

**Request Body**:
```json
{
  "subject": "Email sent to John Smith",
  "body": "Follow up on property inquiry for 123 Main St",
  "people": ["person_abc123"],  // Link to contact
  "projects": ["project_def456"],  // Optional: link to project
  "date": "2026-03-04T10:30:00Z",
  "type": "email"  // or "call", "meeting", "note"
}
```

**Response**:
```json
{
  "id": "note_ghi789",
  "subject": "Email sent to John Smith",
  ...
}
```

#### Get Note
```
GET /v1/note/{noteId}?api_key=YOUR_KEY
```

## Implementation Steps

### Step 1: Update src/clients/cloze.js

```javascript
import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';
import { retryWithBackoff } from './retry.js';

export class ClozeClient {
  constructor() {
    this.baseURL = 'https://api.cloze.com';
    this.apiKey = config.cloze.apiKey;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,  // Use Bearer token
      },
      timeout: 30000,
    });
  }

  async request(method, endpoint, data = null) {
    return retryWithBackoff(async () => {
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
      });
      return response;
    });
  }

  async testConnection() {
    try {
      // Test with user profile endpoint
      await this.request('GET', '/v1/user/profile');
      logger.success('Cloze API connection successful');
      return true;
    } catch (error) {
      logger.error('Cloze API connection failed', error.message);
      return false;
    }
  }

  async createContact(contactData) {
    try {
      // Map our data to Cloze format
      const clozeContact = {
        name: `${contactData.firstName} ${contactData.lastName}`,
        emails: [
          {
            email: contactData.email,
            type: 'work',
          },
        ],
        phones: [
          {
            phone: contactData.phone,
            type: 'mobile',
          },
        ],
        addresses: contactData.address ? [
          {
            street: contactData.address.street,
            city: contactData.address.city,
            state: contactData.address.state,
            zip: contactData.address.zip,
            type: 'work',
          },
        ] : [],
        company: contactData.company || '',
        customFields: {
          contactType: contactData.type,
          emailSubscribed: contactData.emailSubscriptionStatus,
          ...contactData.customFields,
        },
      };

      const response = await this.request('PUT', '/v1/people', clozeContact);

      return {
        id: response.data.id,
        ...contactData,
      };
    } catch (error) {
      logger.error('Failed to create Cloze contact', error.message);
      throw error;
    }
  }

  async createProperty(propertyData) {
    try {
      // Create as a project with property type
      const clozeProperty = {
        name: `Property: ${propertyData.address.street}`,
        people: [propertyData.contactId],
        customFields: {
          entityType: 'property',
          address: propertyData.address.street,
          city: propertyData.address.city,
          state: propertyData.address.state,
          zip: propertyData.address.zip,
          type: propertyData.type,
          price: propertyData.price,
          bedrooms: propertyData.bedrooms,
          bathrooms: propertyData.bathrooms,
          squareFeet: propertyData.squareFeet,
        },
      };

      const response = await this.request('PUT', '/v1/project', clozeProperty);

      return {
        id: response.data.id,
        ...propertyData,
      };
    } catch (error) {
      logger.error('Failed to create Cloze property', error.message);
      throw error;
    }
  }

  async createDeal(dealData) {
    try {
      const clozeDeal = {
        name: dealData.name,
        people: [dealData.contactId],
        stage: dealData.status.toLowerCase().replace(/\s+/g, '-'),
        value: dealData.value,
        expectedCloseDate: dealData.expectedCloseDate,
        actualCloseDate: dealData.actualCloseDate,
        customFields: {
          propertyId: dealData.propertyId,
          dealType: 'real-estate',
        },
      };

      const response = await this.request('PUT', '/v1/project', clozeDeal);

      return {
        id: response.data.id,
        ...dealData,
      };
    } catch (error) {
      logger.error('Failed to create Cloze deal', error.message);
      throw error;
    }
  }

  async createActivity(activityData) {
    try {
      const clozeNote = {
        subject: activityData.subject,
        body: activityData.description,
        people: [activityData.contactId],
        date: activityData.timestamp,
        type: activityData.type.toLowerCase(),
      };

      const response = await this.request('PUT', '/v1/note', clozeNote);

      return {
        id: response.data.id,
        ...activityData,
      };
    } catch (error) {
      logger.error('Failed to create Cloze activity', error.message);
      throw error;
    }
  }

  async getContact(contactId) {
    try {
      const response = await this.request('GET', `/v1/people/${contactId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get Cloze contact ${contactId}`, error.message);
      throw error;
    }
  }
}

export default ClozeClient;
```

## Testing Checklist

- [ ] Obtain Cloze API key from https://help.cloze.com/article/2176-api-key
- [ ] Add API key to `.env` file as `CLOZE_API_KEY`
- [ ] Test connection: `node src/index.js --platform cloze --count 1 --dry-run`
- [ ] Review actual field requirements in Cloze UI
- [ ] Map custom field names to match your Cloze account setup
- [ ] Test with 1 contact: `node src/index.js --platform cloze --count 1`
- [ ] Verify contact appears in Cloze
- [ ] Test with 5 contacts
- [ ] Monitor for errors and adjust field mappings
- [ ] Test with 10 contacts
- [ ] Scale up to 100 contacts
- [ ] Run full 1000 contact population

## Common Issues

### Issue: Custom Field Validation

**Problem**: Cloze rejects custom fields

**Solution**: Custom fields are schemaless by default. If you're getting validation errors, check if your Cloze account has schema validation enabled. You can disable it by not passing `"validation": "schema"`.

### Issue: Stage/Status Names

**Problem**: Deal status not recognized

**Solution**: Cloze uses stages that are account-specific. Use the Account API to fetch valid stages:
```
GET /v1/account/stages?api_key=YOUR_KEY
```

Then map our statuses to their stages.

## Next Steps

1. **Get API Key**: Visit https://help.cloze.com/article/2176-api-key
2. **Update Client**: Implement the code above in `src/clients/cloze.js`
3. **Test**: Start with small batches
4. **Verify**: Check data appears correctly in Cloze UI
5. **Scale**: Increase to full 1000 contacts

## Support

- **Cloze API Docs**: https://developer.cloze.com/
- **Cloze Support**: support@cloze.com
- **API Help**: https://help.cloze.com/article/2176-api-key
