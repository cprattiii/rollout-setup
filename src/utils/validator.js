/**
 * Data validation utility
 */

export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export const validator = {
  /**
   * Validate email address format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate US phone number format
   */
  isValidPhone(phone) {
    // Accepts: (123) 456-7890, 123-456-7890, 1234567890
    const phoneRegex = /^[\d\s\-\(\)]+$/;
    const digits = phone.replace(/\D/g, '');
    return phoneRegex.test(phone) && digits.length === 10;
  },

  /**
   * Validate required fields are present
   */
  validateRequired(obj, fields) {
    const missing = [];
    for (const field of fields) {
      if (!obj[field] || obj[field] === '') {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missing.join(', ')}`,
        missing[0]
      );
    }
    return true;
  },

  /**
   * Validate contact data
   */
  validateContact(contact) {
    const required = ['firstName', 'lastName', 'email', 'phone'];
    this.validateRequired(contact, required);

    if (!this.isValidEmail(contact.email)) {
      throw new ValidationError('Invalid email format', 'email');
    }

    if (!this.isValidPhone(contact.phone)) {
      throw new ValidationError('Invalid phone format', 'phone');
    }

    if (contact.address) {
      const addressRequired = ['street', 'city', 'state', 'zip'];
      this.validateRequired(contact.address, addressRequired);
    }

    return true;
  },

  /**
   * Validate property data
   */
  validateProperty(property) {
    const required = ['contactId', 'propertyType', 'price'];
    this.validateRequired(property, required);

    if (property.address) {
      const addressRequired = ['street', 'city', 'state', 'zip'];
      this.validateRequired(property.address, addressRequired);
    }

    if (property.price < 0) {
      throw new ValidationError('Price must be positive', 'price');
    }

    return true;
  },

  /**
   * Validate deal data
   */
  validateDeal(deal) {
    const required = ['contactId', 'name', 'status', 'value'];
    this.validateRequired(deal, required);

    if (deal.value < 0) {
      throw new ValidationError('Deal value must be positive', 'value');
    }

    return true;
  },

  /**
   * Validate activity data
   */
  validateActivity(activity) {
    const required = ['contactId', 'type', 'subject', 'timestamp'];
    this.validateRequired(activity, required);

    return true;
  },
};

export default validator;
