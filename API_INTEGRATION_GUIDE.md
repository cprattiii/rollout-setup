# API Integration Guide

This guide documents how to integrate the real Cloze and Lofty API endpoints into the rollout-setup tool.

## Current Status

The API clients (`src/clients/cloze.js` and `src/clients/lofty.js`) currently contain **placeholder endpoints** marked with `TODO` comments. These need to be updated with actual API endpoints from the platform documentation.

## Lofty API Documentation

**Official Documentation**: https://api.lofty.com/docs/reference

To integrate Lofty API:

1. Visit https://api.lofty.com/docs/reference
2. Review authentication requirements
3. Find endpoints for:
   - Creating contacts/leads
   - Creating properties/listings
   - Creating deals/opportunities
   - Creating activities/tasks/notes
4. Update `src/clients/lofty.js` with actual endpoints

## Cloze API Documentation

**Official Documentation**: Search for "Cloze API documentation" or check:
- https://www.cloze.com/developer
- https://api.cloze.com/api-docs/
- Contact Cloze support for API access

To integrate Cloze API:

1. Obtain API documentation from Cloze
2. Review authentication requirements
3. Find endpoints for:
   - Creating contacts/people
   - Creating properties/deals
   - Creating deals/opportunities
   - Creating activities/interactions
4. Update `src/clients/cloze.js` with actual endpoints

## Integration Steps

### Step 1: Review API Documentation

For each platform, document:

- **Base URL**: e.g., `https://api.lofty.com/v1` or `https://api.cloze.com/v1`
- **Authentication Method**:
  - Bearer token: `Authorization: Bearer ${API_KEY}`
  - API key header: `X-API-Key: ${API_KEY}`
  - Basic auth: `Authorization: Basic ${base64(key:secret)}`
- **Rate Limits**: Requests per second/minute/hour
- **Request Format**: JSON body structure
- **Response Format**: Expected response fields
- **Error Handling**: Error codes and messages

### Step 2: Update Client Files

Update the placeholder endpoints in the client files:

#### src/clients/lofty.js

Current placeholders:
```javascript
// TODO: Replace with actual Lofty API endpoints
this.baseURL = 'https://api.lofty.com/v1';  // Update this
```

Update these methods:
- `createContact(contactData)` - Line ~40
- `createProperty(propertyData)` - Line ~60
- `createDeal(dealData)` - Line ~80
- `createActivity(activityData)` - Line ~100

#### src/clients/cloze.js

Current placeholders:
```javascript
// TODO: Replace with actual Cloze API endpoints
this.baseURL = 'https://api.cloze.com/v1';  // Update this
```

Update these methods:
- `createContact(contactData)` - Line ~40
- `createProperty(propertyData)` - Line ~60
- `createDeal(dealData)` - Line ~80
- `createActivity(activityData)` - Line ~100

### Step 3: Map Data Fields

Create a mapping document for each platform showing how our generated data maps to their API fields:

#### Contact Field Mapping Example

| Our Field | Lofty API Field | Cloze API Field |
|-----------|-----------------|-----------------|
| firstName | first_name | firstName |
| lastName | last_name | lastName |
| email | email_address | email |
| phone | phone_number | phone |
| address.street | address.line1 | street |
| address.city | address.city | city |

Create files:
- `LOFTY_FIELD_MAPPING.md`
- `CLOZE_FIELD_MAPPING.md`

### Step 4: Test with Small Batches

Before running full population:

```bash
# Test with 5 contacts in dry-run mode
node src/index.js --platform lofty --count 5 --dry-run

# Test with 5 contacts with actual API calls
node src/index.js --platform lofty --count 5

# Verify the data was created
node src/index.js --platform lofty --count 5 --verify
```

Check for:
- Authentication errors
- Field mapping issues
- Rate limit errors
- Data validation errors

### Step 5: Adjust Rate Limiting

Based on API rate limits, update `.env`:

```env
# If API allows 100 requests/minute:
BATCH_SIZE=10
BATCH_DELAY_MS=600  # 10 batches/minute = 100 requests/minute
MAX_CONCURRENT=1

# If API allows 1000 requests/minute:
BATCH_SIZE=20
BATCH_DELAY_MS=100
MAX_CONCURRENT=3
```

### Step 6: Implement Missing API Methods

The client files have placeholder methods for reading data:

```javascript
// These need implementation for verification:
async getContact(contactId) { /* TODO */ }
async getProperty(propertyId) { /* TODO */ }
async getDeal(dealId) { /* TODO */ }
async getActivity(activityId) { /* TODO */ }
```

Implement these to enable full verification functionality.

## Example API Client Update

Here's an example of updating a placeholder endpoint:

**Before** (placeholder):
```javascript
async createContact(contactData) {
  try {
    // TODO: Replace with actual Lofty API endpoint
    const response = await this.request('POST', '/contacts', contactData);
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

**After** (actual implementation):
```javascript
async createContact(contactData) {
  try {
    // Map our data to Lofty's expected format
    const loftyContact = {
      first_name: contactData.firstName,
      last_name: contactData.lastName,
      email_address: contactData.email,
      phone_number: contactData.phone,
      contact_type: contactData.type.toLowerCase(),
      address: {
        line1: contactData.address?.street,
        city: contactData.address?.city,
        state: contactData.address?.state,
        postal_code: contactData.address?.zip,
      },
      custom_fields: contactData.customFields,
    };

    const response = await this.request('POST', '/api/v1/contacts', loftyContact);

    // Return with our ID format
    return {
      id: response.data.id,
      ...contactData,
    };
  } catch (error) {
    logger.error('Failed to create Lofty contact', error.message);
    throw error;
  }
}
```

## Testing Checklist

- [ ] Obtain API credentials from both platforms
- [ ] Add credentials to `.env` file
- [ ] Review API documentation thoroughly
- [ ] Update base URLs in client files
- [ ] Create field mapping documents
- [ ] Update all `createX()` methods with real endpoints
- [ ] Test authentication with `testConnection()`
- [ ] Test with 1 contact (dry-run)
- [ ] Test with 1 contact (real API call)
- [ ] Verify contact was created in platform
- [ ] Test with 5 contacts
- [ ] Test with 10 contacts
- [ ] Monitor rate limits and adjust settings
- [ ] Test with 100 contacts
- [ ] Implement `getX()` methods for verification
- [ ] Test verification functionality
- [ ] Run full 1000 contact population

## Common Issues and Solutions

### Issue: Authentication Fails

**Symptoms**: 401 Unauthorized errors

**Solutions**:
1. Verify API key is correct in `.env`
2. Check if API key needs to be in specific header
3. Verify API key has correct permissions
4. Check if IP whitelist is required

### Issue: Field Validation Errors

**Symptoms**: 400 Bad Request with field validation messages

**Solutions**:
1. Review API documentation for required fields
2. Check field format requirements (e.g., phone number format)
3. Add field transformations in client methods
4. Update validator.js to match API requirements

### Issue: Rate Limit Errors

**Symptoms**: 429 Too Many Requests errors

**Solutions**:
1. Increase `BATCH_DELAY_MS` in `.env`
2. Decrease `BATCH_SIZE` in `.env`
3. Decrease `MAX_CONCURRENT` in `.env`
4. Check API documentation for exact rate limits

### Issue: Data Not Appearing in Platform

**Symptoms**: API calls succeed but data not visible

**Solutions**:
1. Check if data needs approval/activation
2. Verify correct account/workspace is being used
3. Check if created records have correct status
4. Verify user permissions allow data visibility

## Support Resources

**Lofty API**:
- Documentation: https://api.lofty.com/docs/reference
- Support: Contact Lofty support or check their developer portal

**Cloze API**:
- Documentation: Check https://www.cloze.com/developer
- Support: Contact Cloze support for API access

**This Project**:
- Specification: `codev/specs/2-rollout-setup.md`
- Implementation Plan: `codev/plans/2-rollout-setup.md`
- README: `README.md`

## Next Steps

1. **Immediate**: Visit https://api.lofty.com/docs/reference to review Lofty API
2. **Immediate**: Obtain Cloze API documentation
3. **Short-term**: Create field mapping documents for both platforms
4. **Short-term**: Update client files with actual endpoints
5. **Medium-term**: Test with small batches and verify data
6. **Long-term**: Run full 1000-contact population for both platforms
