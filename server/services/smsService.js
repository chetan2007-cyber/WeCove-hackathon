const axios = require('axios');

/**
 * SMS Dispatch Service
 * Supports Twilio, Fast2SMS (Indian gateway), and Development fallback.
 */
class SmsService {
  /**
   * Dispatch 6-digit OTP to mobile phone
   * @param {string} phone Normalized E.164 phone (+91XXXXXXXXXX)
   * @param {string} otp 6-digit verification code
   * @returns {Promise<{ delivered: boolean, provider: string, message: string }>}
   */
  async sendOtp(phone, otp) {
    const messageText = `Your Smriti AI Memory Care verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;

    // 1. Try Twilio if configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const client = require('twilio')(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        const result = await client.messages.create({
          body: messageText,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
        console.log(`[SMS Gateway] ✅ Dispatched via Twilio SID: ${result.sid}`);
        return { delivered: true, provider: 'twilio', message: 'SMS dispatched successfully via Twilio' };
      } catch (err) {
        console.error('[SMS Gateway] ❌ Twilio dispatch failed:', err.message);
      }
    }

    // 2. Try Fast2SMS (Popular low-cost Indian SMS Gateway)
    if (process.env.FAST2SMS_API_KEY) {
      try {
        // Fast2SMS requires 10-digit number without +91
        const raw10 = phone.replace(/^\+91/, '');
        const res = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
          route: 'otp',
          variables_values: otp,
          numbers: raw10
        }, {
          headers: {
            authorization: process.env.FAST2SMS_API_KEY
          }
        });
        if (res.data?.return) {
          console.log(`[SMS Gateway] ✅ Dispatched via Fast2SMS to ${raw10}`);
          return { delivered: true, provider: 'fast2sms', message: 'SMS dispatched successfully via Fast2SMS' };
        }
      } catch (err) {
        console.error('[SMS Gateway] ❌ Fast2SMS dispatch failed:', err.message);
      }
    }

    // 3. Fallback: SMS Provider not configured
    console.warn(`[SMS Gateway] ⚠️ No SMS provider configured. Generated OTP for ${phone}: ${otp}`);
    return {
      delivered: false,
      provider: 'none',
      message: 'No SMS provider credentials configured (Set TWILIO_ACCOUNT_SID or FAST2SMS_API_KEY in server/.env). Code is provided in dev mode.'
    };
  }
}

module.exports = new SmsService();
