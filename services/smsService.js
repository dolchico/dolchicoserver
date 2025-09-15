// services/smsService.js

import dotenv from 'dotenv';
dotenv.config();
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send an OTP SMS to a user's phone number
export const sendOTP = async (phoneNumber, otp, purpose = 'login') => {
  try {
    let messageBody;
    
    switch (purpose) {
      case 'password-reset':
        messageBody = `Your Dolchi Co password reset code is: ${otp}. Do not share this code with anyone.`;
        break;
      case 'phone-change':
        messageBody = `Your Dolchi Co phone number change verification code is: ${otp}. Do not share this code with anyone.`;
        break;
      case 'account-deletion':
        messageBody = `Your Dolchi Co account deletion verification code is: ${otp}. WARNING: This will permanently delete your account. Do not share this code.`;
        break;
      case 'login':
      case 'register':
      default:
        messageBody = `Your Dolchi Co login code is: ${otp}`;
        break;
    }

    const message = await client.messages.create({
      body: messageBody,
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
      to: phoneNumber,
    });
    return message.sid;
  } catch (error) {
    console.error('Failed to send OTP SMS:', error);
    throw new Error('Could not send OTP SMS');
  }
};
