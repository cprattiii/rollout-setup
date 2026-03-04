# Lofty API Integration Guide

## Overview

**Official Documentation**: https://api.lofty.com/docs/reference
**Base URL**: `https://api.lofty.com` (verify from docs)
**API Version**: Check documentation

## Authentication

Visit https://api.lofty.com/docs/reference to determine the authentication method.

Common methods for real estate CRMs:
- API Key in header: `X-API-Key: YOUR_KEY`
- Bearer token: `Authorization: Bearer YOUR_KEY`
- Basic auth: `Authorization: Basic base64(username:password)`

**Action Required**: Review the documentation and update this section with the correct authentication method.

## API Endpoints to Implement

Visit https://api.lofty.com/docs/reference and look for these endpoints:

### 1. Contacts/Leads

**Endpoint to find**:
- `POST /api/v1/contacts` or `/api/v1/leads`
- `GET /api/v1/contacts/{id}` or `/api/v1/leads/{id}`

**Expected Request Format**:
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "email": "carl.pratt+lofty_0001@constantcontact.com",
  "phone": "(555) 123-4567",
  "address": {
    "street": "123 Main St",
    "city": "Boston",
    "state": "MA",
    "zip": "02101"
  },
  "contact_type": "buyer",
  "custom_fields": {
    "budget_range": "$400k-$600k",
    "property_preferences": "Single Family"
  }
}
```

### 2. Properties/Listings

**Endpoint to find**:
- `POST /api/v1/properties` or `/api/v1/listings`
- `GET /api/v1/properties/{id}`

**Expected Request Format**:
```json
{
  "contact_id": "contact_abc123",
  "address": {
    "street": "123 Main St",
    "city": "Boston",
    "state": "MA",
    "zip": "02101"
  },
  "property_type": "residential",
  "price": 450000,
  "bedrooms": 3,
  "bathrooms": 2.5,
  "square_feet": 2200
}
```

### 3. Deals/Opportunities

**Endpoint to find**:
- `POST /api/v1/deals` or `/api/v1/opportunities`
- `GET /api/v1/deals/{id}`

**Expected Request Format**:
```json
{
  "name": "123 Main St - Purchase",
  "contact_id": "contact_abc123",
  "property_id": "property_xyz789",
  "status": "qualified",
  "value": 450000,
  "expected_close_date": "2026-06-15",
  "actual_close_date": null
}
```

### 4. Activities/Tasks/Notes

**Endpoint to find**:
- `POST /api/v1/activities` or `/api/v1/tasks` or `/api/v1/notes`
- `GET /api/v1/activities/{id}`

**Expected Request Format**:
```json
{
  "contact_id": "contact_abc123",
  "type": "email",
  "subject": "Email sent to John Smith",
  "description": "Follow up on property inquiry",
  "timestamp": "2026-03-04T10:30:00Z"
}
```

## Implementation Template

### Step 1: Review Lofty API Documentation

1. Visit https://api.lofty.com/docs/reference
2. Find the sections for:
   - Authentication
   - Contacts/Leads API
   - Properties/Listings API
   - Deals/Opportunities API
   - Activities/Tasks/Notes API
3. Document:
   - Base URL
   - Authentication headers
   - Exact endpoint paths
   - Request body field names
   - Response formats
   - Rate limits

### Step 2: Create Field Mapping

Create a table mapping our data fields to Lofty's API fields:

| Our Field | Lofty API Field | Notes |
|-----------|-----------------|-------|
| firstName | first_name | |
| lastName | last_name | |
| email | email | |
| phone | phone | Format: check if (555) 123-4567 or 5551234567 |
| address.street | address.street or address.line1 | |
| address.city | address.city | |
| address.state | address.state | |
| address.zip | address.zip or address.postal_code | |
| type | contact_type or type | Values: buyer, seller, lead |

### Step 3: Update src/clients/lofty.js

```javascript
import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';
import { retryWithBackoff } from './retry.js';

export class LoftyClient {
  constructor() {
    // UPDATE THIS from Lofty API docs
    this.baseURL = 'https://api.lofty.com';  // Verify this URL
    this.apiKey = config.lofty.apiKey;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        // UPDATE THIS based on Lofty's auth method:
        'X-API-Key': this.apiKey,  // OR 'Authorization': `Bearer ${this.apiKey}`
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
      // UPDATE THIS with actual test endpoint from Lofty docs
      // Common options: /api/v1/user, /api/v1/account, /api/v1/me
      await this.request('GET', '/api/v1/user');
      logger.success('Lofty API connection successful');
      return true;
    } catch (error) {
      logger.error('Lofty API connection failed', error.message);
      return false;
    }
  }

  async createContact(contactData) {
    try {
      // Map our data to Lofty format
      // UPDATE THESE FIELD NAMES based on Lofty API docs
      const loftyContact = {
        first_name: contactData.firstName,
        last_name: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        contact_type: contactData.type.toLowerCase(),
        address: {
          street: contactData.address?.street,
          city: contactData.address?.city,
          state: contactData.address?.state,
          zip: contactData.address?.zip,
        },
        company: contactData.company,
        custom_fields: contactData.customFields,
      };

      // UPDATE THIS endpoint from Lofty API docs
      const response = await this.request('POST', '/api/v1/contacts', loftyContact);

      return {
        id: response.data.id,
        ...contactData,
      };
    } catch (error) {
      logger.error('Failed to create Lofty contact', error.message);
      throw error;
    }
  }

  async createProperty(propertyData) {
    try {
      // UPDATE THESE FIELD NAMES based on Lofty API docs
      const loftyProperty = {
        contact_id: propertyData.contactId,
        address: {
          street: propertyData.address.street,
          city: propertyData.address.city,
          state: propertyData.address.state,
          zip: propertyData.address.zip,
        },
        property_type: propertyData.type.toLowerCase(),
        price: propertyData.price,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        square_feet: propertyData.squareFeet,
      };

      // UPDATE THIS endpoint from Lofty API docs
      const response = await this.request('POST', '/api/v1/properties', loftyProperty);

      return {
        id: response.data.id,
        ...propertyData,
      };
    } catch (error) {
      logger.error('Failed to create Lofty property', error.message);
      throw error;
    }
  }

  async createDeal(dealData) {
    try {
      // UPDATE THESE FIELD NAMES based on Lofty API docs
      const loftyDeal = {
        name: dealData.name,
        contact_id: dealData.contactId,
        property_id: dealData.propertyId,
        status: dealData.status.toLowerCase().replace(/\s+/g, '-'),
        value: dealData.value,
        expected_close_date: dealData.expectedCloseDate,
        actual_close_date: dealData.actualCloseDate,
      };

      // UPDATE THIS endpoint from Lofty API docs
      const response = await this.request('POST', '/api/v1/deals', loftyDeal);

      return {
        id: response.data.id,
        ...dealData,
      };
    } catch (error) {
      logger.error('Failed to create Lofty deal', error.message);
      throw error;
    }
  }

  async createActivity(activityData) {
    try {
      // UPDATE THESE FIELD NAMES based on Lofty API docs
      const loftyActivity = {
        contact_id: activityData.contactId,
        type: activityData.type.toLowerCase(),
        subject: activityData.subject,
        description: activityData.description,
        timestamp: activityData.timestamp,
      };

      // UPDATE THIS endpoint from Lofty API docs
      const response = await this.request('POST', '/api/v1/activities', loftyActivity);

      return {
        id: response.data.id,
        ...activityData,
      };
    } catch (error) {
      logger.error('Failed to create Lofty activity', error.message);
      throw error;
    }
  }

  async getContact(contactId) {
    try {
      // UPDATE THIS endpoint from Lofty API docs
      const response = await this.request('GET', `/api/v1/contacts/${contactId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get Lofty contact ${contactId}`, error.message);
      throw error;
    }
  }
}

export default LoftyClient;
```

## Testing Checklist

- [ ] Visit https://api.lofty.com/docs/reference
- [ ] Document authentication method
- [ ] Document all endpoint URLs
- [ ] Create complete field mapping table
- [ ] Obtain Lofty API credentials
- [ ] Add credentials to `.env` file
- [ ] Update `src/clients/lofty.js` with correct endpoints and field names
- [ ] Test connection: `node src/index.js --platform lofty --count 1 --dry-run`
- [ ] Test with 1 contact: `node src/index.js --platform lofty --count 1`
- [ ] Verify contact appears in Lofty
- [ ] Test with 5 contacts
- [ ] Test with 10 contacts
- [ ] Scale up to 100 contacts
- [ ] Run full 1000 contact population

## Rate Limiting

**Action Required**: Check Lofty API documentation for rate limits.

Typical limits for real estate CRMs:
- 100 requests/minute
- 1000 requests/hour
- 10,000 requests/day

Adjust `.env` settings accordingly:
```env
# For 100 requests/minute limit:
BATCH_SIZE=10
BATCH_DELAY_MS=600
MAX_CONCURRENT=1
```

## Common Issues

### Issue: Phone Number Format

**Problem**: API rejects phone number format

**Solution**: Check if Lofty requires a specific format:
- `(555) 123-4567` (current format)
- `555-123-4567`
- `5551234567` (digits only)
- `+15551234567` (international format)

Update the phone formatter in `src/generators/contact.js` if needed.

### Issue: Required Fields

**Problem**: API returns 400 Bad Request for missing required fields

**Solution**: Check Lofty API docs for required fields. Common requirements:
- Email (required)
- Phone (required)
- First name + Last name OR full name
- Contact type/status

### Issue: Custom Field Schema

**Problem**: Custom fields not being saved

**Solution**: Some CRMs require custom fields to be pre-defined. Check if you need to create custom field definitions in Lofty before populating data.

## Next Steps

1. **Access Documentation**: Visit https://api.lofty.com/docs/reference
2. **Document Everything**: Fill in all the "UPDATE THIS" sections above
3. **Get Credentials**: Obtain API key or OAuth credentials from Lofty
4. **Update Client**: Implement the correct endpoints and field mappings
5. **Test Small**: Start with 1-5 contacts
6. **Verify**: Check data appears correctly in Lofty UI
7. **Scale Up**: Gradually increase to full 1000 contacts

## Support

- **Lofty API Docs**: https://api.lofty.com/docs/reference
- **Lofty Support**: Contact Lofty support for API access
