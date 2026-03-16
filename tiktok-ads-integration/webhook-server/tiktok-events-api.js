/**
 * TikTok Events API Client
 * Sends server-side events to TikTok for conversion tracking
 */

const https = require('https');
const crypto = require('crypto');

class TikTokEventsAPI {
    constructor(accessToken, pixelId) {
        this.accessToken = accessToken;
        this.pixelId = pixelId;
        this.apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
    }

    /**
     * Hash email or phone for privacy (SHA256)
     */
    hashValue(value) {
        if (!value) return null;
        // Normalize: lowercase, trim whitespace
        const normalized = value.toLowerCase().trim();
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }

    /**
     * Format phone number (remove non-digits, keep country code)
     */
    formatPhone(phone) {
        if (!phone) return null;
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        // If doesn't start with country code, assume US (+1)
        return digits.startsWith('1') ? digits : '1' + digits;
    }

    /**
     * Send CompleteRegistration event to TikTok
     */
    async trackCompleteRegistration(leadData) {
        const event = {
            pixel_code: this.pixelId,
            event: 'CompleteRegistration',
            timestamp: new Date(leadData.timestamp || leadData.receivedAt).toISOString(),
            context: {
                user_agent: leadData.userAgent || 'Server',
                ip: leadData.ip || '',
            },
            properties: {
                contents: [],
                content_type: 'product',
            },
            // Advanced matching parameters
            ...(leadData.email && {
                email: this.hashValue(leadData.email)
            }),
            ...(leadData.phone && {
                phone_number: this.hashValue(this.formatPhone(leadData.phone))
            })
        };

        return this.sendEvent(event);
    }

    /**
     * Send event to TikTok Events API
     */
    sendEvent(event) {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify({
                pixel_code: this.pixelId,
                event: event.event,
                timestamp: event.timestamp,
                context: event.context,
                properties: event.properties,
                ...(event.email && { email: event.email }),
                ...(event.phone_number && { phone_number: event.phone_number })
            });

            const options = {
                hostname: 'business-api.tiktok.com',
                port: 443,
                path: '/open_api/v1.3/event/track/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Token': this.accessToken,
                    'Content-Length': Buffer.byteLength(payload)
                },
                rejectUnauthorized: true // Keep SSL verification for security
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (res.statusCode === 200 && response.code === 0) {
                            resolve({
                                success: true,
                                message: 'Event sent to TikTok',
                                response
                            });
                        } else {
                            reject({
                                success: false,
                                statusCode: res.statusCode,
                                error: response.message || 'Unknown error',
                                response
                            });
                        }
                    } catch (error) {
                        reject({
                            success: false,
                            error: 'Failed to parse TikTok response',
                            raw: data
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject({
                    success: false,
                    error: error.message
                });
            });

            req.write(payload);
            req.end();
        });
    }

    /**
     * Test the Events API connection
     */
    async testConnection() {
        const testEvent = {
            pixel_code: this.pixelId,
            event: 'CompleteRegistration',
            timestamp: new Date().toISOString(),
            context: {
                user_agent: 'TikTok-Events-API-Test',
                ip: '127.0.0.1'
            },
            properties: {
                contents: [],
                content_type: 'product'
            },
            test_event_code: 'TEST10991' // Test event code from Events Manager
        };

        return this.sendEvent(testEvent);
    }
}

module.exports = TikTokEventsAPI;
