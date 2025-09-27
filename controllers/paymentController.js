import logger from '../logger.js';
import { priceUtils } from '../utils/priceUtils.js';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getOrderPaymentStatus,
  retryFailedPayment
} from '../services/paymentService.js';
import { verifyPaymentWithAPI } from '../services/alternativePaymentVerification.js';

// Utility function to convert BigInt to Number safely
const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

// Alternative utility for nested objects
const convertBigIntFields = (data) => {
  if (data === null || data === undefined) return data;
  
  if (Array.isArray(data)) {
    return data.map(convertBigIntFields);
  }
  
  if (typeof data === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'bigint') {
        converted[key] = Number(value);
      } else if (typeof value === 'object') {
        converted[key] = convertBigIntFields(value);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }
  
  return typeof data === 'bigint' ? Number(data) : data;
};

/**
 * Create Razorpay order from cart items
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, amount, address, notes } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Items are required and must be a non-empty array' 
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be greater than 0' 
      });
    }

    if (!address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Address is required' 
      });
    }

    const orderData = await createRazorpayOrder({
      userId: Number(userId),
      items,
      amount: priceUtils.toPrismaDecimal(amount),
      address,
      notes
    });

    // Convert BigInt fields to Numbers
    const serializedOrderData = convertBigIntFields(orderData);

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: serializedOrderData
    });
  } catch (error) {
    console.error('Create Payment Order Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Verify Razorpay payment and complete order
 */
export const verifyPayment = async (req, res) => {
  try {
  let userId = undefined;
  if (req && req.user && req.user.id) userId = req.user.id;
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    logger.info('=== PAYMENT VERIFICATION CONTROLLER ===');
    logger.debug(`User ID: ${userId}`);
    logger.debug(`Request body keys: ${JSON.stringify(Object.keys(req.body))}`);
    logger.debug('Payment data received', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature ? `${razorpay_signature.substring(0, 10)}...` : 'MISSING'
    });

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      const missingFields = [];
      if (!razorpay_order_id) missingFields.push('razorpay_order_id');
      if (!razorpay_payment_id) missingFields.push('razorpay_payment_id');
      if (!razorpay_signature) missingFields.push('razorpay_signature');
      
  logger.warn(`Missing required fields: ${missingFields.join(', ')}`);
      
      return res.status(400).json({
        success: false,
        message: `Missing required payment verification data: ${missingFields.join(', ')}`,
        receivedData: {
          razorpay_order_id: !!razorpay_order_id,
          razorpay_payment_id: !!razorpay_payment_id,
          razorpay_signature: !!razorpay_signature
        }
      });
    }

  logger.info('All required fields present, proceeding with verification');

    const result = await verifyRazorpayPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId: Number(userId)
    });

    logger.debug('Verification result', {
      verified: result.verified,
      message: result.message,
      orderId: result.orderId
    });

    if (result.verified) {
      // Convert BigInt fields in the result
      const serializedResult = convertBigIntFields(result);
      
  logger.info('Payment verified successfully, sending success response');
      
      res.json({
        success: true,
        message: 'Payment verified and order completed successfully',
        orderId: serializedResult.orderId,
        orderDetails: serializedResult.orderDetails
      });
    } else {
  logger.warn('Payment verification failed, sending error response');
      
      res.status(400).json({
        success: false,
        message: result.message,
        verificationFailed: true
      });
    }
  } catch (error) {
    logger.error('Payment verification controller error', {
      message: error.message,
      stack: error.stack,
      userId: typeof userId !== 'undefined' ? userId : 'UNKNOWN',
      requestBody: req && req.body ? req.body : 'NO_BODY'
    });
    
    res.status(500).json({ 
      success: false, 
      message: `Payment verification failed: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
};

/**
 * Get payment status for an order
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    if (!orderId || orderId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const orderIdNumber = Number(orderId);
    if (isNaN(orderIdNumber) || orderIdNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Order ID format'
      });
    }

    const status = await getOrderPaymentStatus(orderIdNumber, Number(userId));

    // Convert BigInt fields to Numbers
    const serializedStatus = convertBigIntFields(status);

    res.json({
      success: true,
      data: serializedStatus
    });
  } catch (error) {
    console.error('Get Payment Status Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Retry payment for a failed order
 */
export const retryPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const orderIdNumber = Number(orderId);
    const retryData = await retryFailedPayment(orderIdNumber, Number(userId));

    // Convert BigInt fields to Numbers
    const serializedRetryData = convertBigIntFields(retryData);

    res.json({
      success: true,
      message: 'New payment order created for retry',
      data: serializedRetryData
    });
  } catch (error) {
    console.error('Retry Payment Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};


/**
 * Test endpoint to check Razorpay configuration
 */
export const testRazorpayConfig = async (req, res) => {
  try {
    const hasKeyId = !!process.env.RAZORPAY_KEY_ID;
    const hasKeySecret = !!process.env.RAZORPAY_KEY_SECRET;
    
    console.log("Razorpay Config Check:", {
      hasKeyId,
      hasKeySecret,
      keyIdLength: process.env.RAZORPAY_KEY_ID?.length || 0,
      keySecretLength: process.env.RAZORPAY_KEY_SECRET?.length || 0
    });
    
    res.json({
      success: true,
      config: {
        hasKeyId,
        hasKeySecret,
        keyIdPreview: process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 6)}...` : "MISSING",
        keySecretPreview: process.env.RAZORPAY_KEY_SECRET ? `${process.env.RAZORPAY_KEY_SECRET.substring(0, 6)}...` : "MISSING"
      }
    });
  } catch (error) {
    console.error("Config test error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Test signature generation - DEBUGGING ONLY
 */
export const testSignatureGeneration = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, expected_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'razorpay_order_id and razorpay_payment_id are required for testing'
      });
    }

    const crypto = await import('crypto');
    
    // Generate signature exactly as done in the payment service
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const generatedSignature = crypto.default
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    console.log('=== SIGNATURE GENERATION TEST ===');
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);
    console.log('Body for signature:', body);
    console.log('Generated signature:', generatedSignature);
    console.log('Expected signature:', expected_signature);
    console.log('Signatures match:', generatedSignature === expected_signature);

    res.json({
      success: true,
      test_data: {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        body_string: body,
        generated_signature: generatedSignature,
        expected_signature: expected_signature || 'NOT_PROVIDED',
        signatures_match: expected_signature ? generatedSignature === expected_signature : 'NO_EXPECTED_SIGNATURE',
        secret_key_length: process.env.RAZORPAY_KEY_SECRET?.length || 0
      }
    });
  } catch (error) {
    console.error('Signature test error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/**
 * Alternative payment verification using Razorpay API (no signature needed)
 */
export const verifyPaymentAPI = async (req, res) => {
  try {
    let userId = undefined;
    if (req && req.user && req.user.id) userId = req.user.id;
    const { 
      razorpay_order_id, 
      razorpay_payment_id
    } = req.body;

  logger.info('=== API-BASED PAYMENT VERIFICATION CONTROLLER ===');
  logger.debug(`User ID: ${userId}`);
  logger.debug('Payment data received', { razorpay_order_id, razorpay_payment_id });

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id) {
      const missingFields = [];
      if (!razorpay_order_id) missingFields.push("razorpay_order_id");
      if (!razorpay_payment_id) missingFields.push("razorpay_payment_id");
      
  logger.warn(`Missing required fields: ${missingFields.join(', ')}`);
      
      return res.status(400).json({
        success: false,
        message: `Missing required payment verification data: ${missingFields.join(", ")}`,
        receivedData: {
          razorpay_order_id: !!razorpay_order_id,
          razorpay_payment_id: !!razorpay_payment_id
        }
      });
    }

  logger.info('All required fields present, proceeding with API verification');

    const result = await verifyPaymentWithAPI({
      razorpay_order_id,
      razorpay_payment_id,
      userId: Number(userId)
    });

    logger.debug('API Verification result', {
      verified: result.verified,
      message: result.message,
      orderId: result.orderId,
      paymentMethod: result.paymentMethod
    });

    if (result.verified) {
      // Convert BigInt fields in the result
      const serializedResult = convertBigIntFields(result);
      
  logger.info('Payment verified successfully via API, sending success response');
      
      res.json({
        success: true,
        message: "Payment verified successfully via Razorpay API",
        orderId: serializedResult.orderId,
        orderDetails: serializedResult.orderDetails,
        paymentMethod: result.paymentMethod,
        verificationMethod: "api"
      });
    } else {
  logger.warn('Payment API verification failed, sending error response');
      
      res.status(400).json({
        success: false,
        message: result.message,
        verificationFailed: true,
        verificationMethod: "api",
        apiResponse: result.apiResponse
      });
    }
  } catch (error) {
    logger.error('API Payment verification controller error', {
      message: error.message,
      stack: error.stack,
  userId: typeof userId !== 'undefined' ? userId : 'UNKNOWN',
  requestBody: req && req.body ? req.body : 'NO_BODY'
    });
    
    res.status(500).json({ 
      success: false, 
      message: `API payment verification failed: ${error.message}`,
      verificationMethod: "api",
      error: process.env.NODE_ENV === "development" ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
};

// Test CORS configuration endpoint
export const testCORS = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CORS is working properly',
    origin: req.get('Origin'),
    timestamp: new Date().toISOString(),
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4000',
      'https://dolchico.com',
      'https://www.dolchico.com',
      'https://valyris-i.onrender.com'
    ]
  });
};