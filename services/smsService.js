// services/smsService.js

import dotenv from 'dotenv';
dotenv.config();
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send an OTP SMS to a user's phone number
export const sendOTP = async (phoneNumber, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your Dolchi Co login code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
      to: phoneNumber,
    });
    return message.sid;
  } catch (error) {
    console.error('Failed to send OTP SMS:', error);
    throw new Error('Could not send OTP SMS');
  }
};
