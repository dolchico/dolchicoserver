import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getOrderPaymentStatus,
  retryFailedPayment
} from '../services/paymentService.js';

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
      amount: parseFloat(amount),
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
    const userId = req.user.id;
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification data'
      });
    }

    const result = await verifyRazorpayPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId: Number(userId)
    });

    if (result.verified) {
      // Convert BigInt fields in the result
      const serializedResult = convertBigIntFields(result);
      
      res.json({
        success: true,
        message: 'Payment verified and order completed successfully',
        orderId: serializedResult.orderId,
        orderDetails: serializedResult.orderDetails
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
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
