# API Research Document

**Status**: Template - Requires API documentation review
**Created**: 2026-03-04
**Purpose**: Document Cloze and Lofty API capabilities for data population

---

## Cloze API

### Authentication
- **Method**: API Key in headers
- **Header Name**: `Authorization: Bearer {API_KEY}` (TBD - confirm with docs)
- **Base URL**: `https://api.cloze.com/v1` (TBD - confirm with docs)

### Endpoints Required

#### 1. Create Contact
```
POST /contacts
Headers: Authorization: Bearer {API_KEY}
Body: {
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zip": "string"
  },
  "customFields": {
    "emailSubscriptionStatus": true,
    "contactType": "Buyer",
    // ... other custom fields
  }
}
Response: { "id": "contact_123", ... }
```

**Status**: ⏳ TODO - Document actual endpoint and schema

#### 2. Create Property
```
POST /properties
Headers: Authorization: Bearer {API_KEY}
Body: {
  "contactId": "contact_123",
  "address": {...},
  "propertyType": "Residential",
  "price": 500000,
  // ... other fields
}
Response: { "id": "property_456", ... }
```

**Status**: ⏳ TODO - Document actual endpoint and schema
**Question**: Does Cloze support properties, or should we use custom fields?

#### 3. Create Deal
```
POST /deals
Headers: Authorization: Bearer {API_KEY}
Body: {
  "contactId": "contact_123",
  "name": "Deal name",
  "status": "Prospect",
  "value": 500000,
  // ... other fields
}
Response: { "id": "deal_789", ... }
```

**Status**: ⏳ TODO - Document actual endpoint and schema

#### 4. Create Activity
```
POST /activities
Headers: Authorization: Bearer {API_KEY}
Body: {
  "contactId": "contact_123",
  "type": "Email",
  "subject": "string",
  "description": "string",
  "timestamp": "ISO8601 date"
}
Response: { "id": "activity_012", ... }
```

**Status**: ⏳ TODO - Document actual endpoint and schema

#### 5. Get Contact Count
```
GET /contacts/count
Headers: Authorization: Bearer {API_KEY}
Response: { "count": 1000 }
```

**Status**: ⏳ TODO - Document actual endpoint

### Rate Limits
- **Requests per second**: TBD
- **Requests per minute**: TBD
- **Requests per hour**: TBD
- **Concurrent requests**: TBD
- **Retry-After header**: TBD
- **Status codes**: 429 for rate limit

**Status**: ⏳ TODO - Document from API docs

---

## Lofty API

### Authentication
- **Method**: API Key in headers
- **Header Name**: `Authorization: Bearer {API_KEY}` (TBD - confirm with docs)
- **Base URL**: `https://api.lofty.com/v1` (TBD - confirm with docs)

### Endpoints Required

#### 1. Create Contact
```
POST /api/contacts
Headers: Authorization: Bearer {API_KEY}
Body: {
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zip": "string"
  },
  "customFields": {
    "emailSubscriptionStatus": true,
    "contactType": "Buyer",
    // ... other custom fields
  }
}
Response: { "id": "contact_123", ... }
```

**Status**: ⏳ TODO - Document actual endpoint and schema

#### 2. Create Property
```
POST /api/properties
Headers: Authorization: Bearer {API_KEY}
Body: {
  "contactId": "contact_123",
  "address": {...},
  "propertyType": "Residential",
  "price": 500000,
  // ... other fields
}
Response: { "id": "property_456", ... }
```

**Status**: ⏳ TODO - Document actual endpoint and schema

#### 3. Create Deal
```
POST /api/deals
Headers: Authorization: Bearer {API_KEY}
Body: {
  "contactId": "contact_123",
  "name": "Deal name",
  "status": "Prospect",
  "value": 500000,
  // ... other fields
}
Response: { "id": "deal_789", ... }
```

**Status**: ⏳ TODO - Document actual endpoint and schema

#### 4. Create Activity
```
POST /api/activities
Headers: Authorization: Bearer {API_KEY}
Body: {
  "contactId": "contact_123",
  "type": "Email",
  "subject": "string",
  "description": "string",
  "timestamp": "ISO8601 date"
}
Response: { "id": "activity_012", ... }
```

**Status**: ⏳ TODO - Document actual endpoint and schema

#### 5. Get Contact Count
```
GET /api/contacts?count=true
Headers: Authorization: Bearer {API_KEY}
Response: { "count": 1000 }
```

**Status**: ⏳ TODO - Document actual endpoint

### Rate Limits
- **Requests per second**: TBD
- **Requests per minute**: TBD
- **Requests per hour**: TBD
- **Concurrent requests**: TBD
- **Retry-After header**: TBD
- **Status codes**: 429 for rate limit

**Status**: ⏳ TODO - Document from API docs

---

## Testing Checklist

### Cloze API Testing
- [ ] Obtain API documentation
- [ ] Obtain API key
- [ ] Test authentication
- [ ] Create test contact
- [ ] Create test property (or use custom fields)
- [ ] Create test deal
- [ ] Create test activity
- [ ] Verify test data in Cloze dashboard
- [ ] Document any API limitations

### Lofty API Testing
- [ ] Obtain API documentation
- [ ] Obtain API key
- [ ] Test authentication
- [ ] Create test contact
- [ ] Create test property
- [ ] Create test deal
- [ ] Create test activity
- [ ] Verify test data in Lofty dashboard
- [ ] Document any API limitations

---

## Action Items for User

**Before implementation can proceed, you need to:**

1. **Provide API Keys**:
   - Create `.env` file from `.env.example`
   - Add Cloze API key
   - Add Lofty API key

2. **Provide API Documentation**:
   - Share Cloze API documentation link or PDF
   - Share Lofty API documentation link or PDF
   - OR provide access to developer portals

3. **Confirm API Access**:
   - Test that API keys work
   - Confirm permission to create contacts, properties, deals, activities
   - Confirm no IP restrictions or other blockers

**Once you provide these, I can:**
- Complete the API research
- Build the API clients with correct endpoints
- Test authentication and basic operations
- Proceed with full implementation

---

## Notes

- Both APIs may have different schemas for the same entities
- Custom fields might need special handling
- Bulk operations may be available (would greatly improve performance)
- Need to understand how relationships work (contact → property linking, etc.)
- Need to know if APIs are RESTful, GraphQL, or other

**Next Step**: User provides API keys and documentation, then we can complete Phase 0.
