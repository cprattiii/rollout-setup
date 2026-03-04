/**
 * Activity data generator
 * Generates realistic activity/interaction data spread over time
 */

import { faker } from '@faker-js/faker';

const ACTIVITY_TYPES = ['Email', 'Call', 'Meeting', 'Note'];

// Activity count ranges by type
const ACTIVITY_COUNTS = {
  Email: { min: 3, max: 10 },
  Call: { min: 1, max: 5 },
  Meeting: { min: 0, max: 3 },
  Note: { min: 2, max: 8 },
};

// Email subjects templates
const EMAIL_SUBJECTS = [
  'Follow up on property inquiry',
  'Schedule showing for {address}',
  'Market update for {city}',
  'New listing matching your criteria',
  'Re: Property question',
  'Your requested information',
  'Great meeting you today',
  'Next steps for {address}',
  'Price adjustment notification',
  'Open house invitation',
];

// Call notes templates
const CALL_NOTES = [
  'Discussed property preferences',
  'Answered questions about {address}',
  'Scheduled showing for next week',
  'Follow up call - still interested',
  'Left voicemail',
  'Brief check-in call',
  'Discussed financing options',
  'Property tour feedback',
  'Market conditions discussion',
  'Negotiation update',
];

// Meeting notes templates
const MEETING_NOTES = [
  'Property showing at {address}',
  'Initial consultation meeting',
  'Contract review meeting',
  'Closing walkthrough',
  'Open house visit',
  'Office meeting to discuss options',
  'Property inspection',
  'Final walkthrough before closing',
];

// General notes templates
const GENERAL_NOTES = [
  'Client prefers {city} area',
  'Budget range: {budget}',
  'Looking for {bedrooms}+ bedrooms',
  'Interested in {propertyType} properties',
  'Pre-qualified for financing',
  'First-time home buyer',
  'Relocating from out of state',
  'Timeline: 3-6 months',
  'Needs to sell current home first',
  'Cash buyer',
];

/**
 * Generate email activity
 * @param {string} contactId - Contact ID
 * @param {Object} contact - Contact data
 * @param {Date} timestamp - Activity timestamp
 * @returns {Object} - Activity data
 */
function generateEmailActivity(contactId, contact, timestamp) {
  const subject = faker.helpers.arrayElement(EMAIL_SUBJECTS)
    .replace('{address}', faker.location.streetAddress())
    .replace('{city}', contact.address?.city || faker.location.city());

  return {
    contactId,
    type: 'Email',
    subject,
    description: `Email sent to ${contact.email}`,
    timestamp: timestamp.toISOString(),
  };
}

/**
 * Generate call activity
 * @param {string} contactId - Contact ID
 * @param {Object} contact - Contact data
 * @param {Date} timestamp - Activity timestamp
 * @returns {Object} - Activity data
 */
function generateCallActivity(contactId, contact, timestamp) {
  const note = faker.helpers.arrayElement(CALL_NOTES)
    .replace('{address}', faker.location.streetAddress());

  return {
    contactId,
    type: 'Call',
    subject: `Phone call with ${contact.firstName} ${contact.lastName}`,
    description: note,
    timestamp: timestamp.toISOString(),
  };
}

/**
 * Generate meeting activity
 * @param {string} contactId - Contact ID
 * @param {Object} contact - Contact data
 * @param {Date} timestamp - Activity timestamp
 * @returns {Object} - Activity data
 */
function generateMeetingActivity(contactId, contact, timestamp) {
  const note = faker.helpers.arrayElement(MEETING_NOTES)
    .replace('{address}', faker.location.streetAddress());

  return {
    contactId,
    type: 'Meeting',
    subject: `Meeting with ${contact.firstName} ${contact.lastName}`,
    description: note,
    timestamp: timestamp.toISOString(),
  };
}

/**
 * Generate note activity
 * @param {string} contactId - Contact ID
 * @param {Object} contact - Contact data
 * @param {Date} timestamp - Activity timestamp
 * @returns {Object} - Activity data
 */
function generateNoteActivity(contactId, contact, timestamp) {
  const note = faker.helpers.arrayElement(GENERAL_NOTES)
    .replace('{city}', contact.address?.city || faker.location.city())
    .replace('{budget}', contact.customFields?.budgetRange || '$400k-$600k')
    .replace('{bedrooms}', faker.number.int({ min: 2, max: 4 }))
    .replace('{propertyType}', faker.helpers.arrayElement(['Single Family', 'Condo', 'Townhouse']));

  return {
    contactId,
    type: 'Note',
    subject: 'Contact note',
    description: note,
    timestamp: timestamp.toISOString(),
  };
}

/**
 * Generate timestamps spread over last 6 months
 * @param {number} count - Number of timestamps to generate
 * @returns {Array<Date>} - Sorted array of timestamps
 */
function generateTimestamps(count) {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const timestamps = [];
  for (let i = 0; i < count; i++) {
    timestamps.push(
      faker.date.between({
        from: sixMonthsAgo,
        to: now,
      })
    );
  }

  // Sort chronologically (oldest first)
  return timestamps.sort((a, b) => a - b);
}

/**
 * Generate activities for a contact
 * @param {string} contactId - Contact ID
 * @param {Object} contact - Contact data
 * @returns {Array} - Array of activities
 */
export function generateActivitiesForContact(contactId, contact) {
  const activities = [];

  // Generate each type of activity based on count ranges
  for (const [type, range] of Object.entries(ACTIVITY_COUNTS)) {
    const count = faker.number.int(range);

    for (let i = 0; i < count; i++) {
      activities.push({ type });
    }
  }

  // Shuffle activities
  const shuffled = faker.helpers.shuffle(activities);

  // Generate timestamps for all activities
  const timestamps = generateTimestamps(shuffled.length);

  // Create full activity objects with timestamps
  const fullActivities = shuffled.map((activity, index) => {
    const timestamp = timestamps[index];

    switch (activity.type) {
      case 'Email':
        return generateEmailActivity(contactId, contact, timestamp);
      case 'Call':
        return generateCallActivity(contactId, contact, timestamp);
      case 'Meeting':
        return generateMeetingActivity(contactId, contact, timestamp);
      case 'Note':
        return generateNoteActivity(contactId, contact, timestamp);
      default:
        return generateNoteActivity(contactId, contact, timestamp);
    }
  });

  return fullActivities;
}

/**
 * Generate activities for multiple contacts
 * @param {Array} contacts - Array of contacts with IDs
 * @returns {Array} - Array of all activities
 */
export function generateActivitiesForContacts(contacts) {
  const allActivities = [];

  for (const contact of contacts) {
    const activities = generateActivitiesForContact(contact.id, contact);
    allActivities.push(...activities);
  }

  return allActivities;
}

/**
 * Verify activity type distribution
 * @param {Array} activities - Array of activities
 * @returns {Object} - Distribution statistics
 */
export function verifyActivityDistribution(activities) {
  const distribution = {
    Email: 0,
    Call: 0,
    Meeting: 0,
    Note: 0,
  };

  for (const activity of activities) {
    distribution[activity.type]++;
  }

  const total = activities.length;
  const averages = {};

  // Calculate average per contact (assuming activities are for same number of contacts)
  const contactCount = Math.ceil(total / 15); // Rough estimate
  for (const [type, count] of Object.entries(distribution)) {
    averages[type] = (count / contactCount).toFixed(1);
  }

  return {
    counts: distribution,
    averages,
    total,
  };
}

/**
 * Verify activity timestamps are within 6 months
 * @param {Array} activities - Array of activities
 * @returns {Object} - Timestamp statistics
 */
export function verifyActivityTimestamps(activities) {
  if (activities.length === 0) return { valid: true, message: 'No activities to check' };

  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  let validCount = 0;
  let invalidCount = 0;

  for (const activity of activities) {
    const timestamp = new Date(activity.timestamp);
    if (timestamp >= sixMonthsAgo && timestamp <= now) {
      validCount++;
    } else {
      invalidCount++;
    }
  }

  return {
    valid: invalidCount === 0,
    validCount,
    invalidCount,
    total: activities.length,
  };
}

export default {
  generateActivitiesForContact,
  generateActivitiesForContacts,
  verifyActivityDistribution,
  verifyActivityTimestamps,
};
