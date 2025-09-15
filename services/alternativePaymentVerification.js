import { razorpayInstance } from '../config/razorpay.js';
import prisma from '../lib/prisma.js';
import logger from '../logger.js';

/**
 * Alternative payment verification using Razorpay API
 * This bypasses signature verification and directly checks with Razorpay
 */
export const verifyPaymentWithAPI = async (data) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, userId } = data;

  logger.info('=== API-BASED PAYMENT VERIFICATION ===');
  logger.debug('Input data', { razorpay_order_id, razorpay_payment_id, userId });

    // Fetch payment details from Razorpay API
    let payment;
    try {
      payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
    } catch (apiErr) {
      // Log full error object to capture cases where message is undefined
      logger.error('Failed to fetch payment from Razorpay API', { error: apiErr, paymentId: razorpay_payment_id });
      const errMsg = apiErr && apiErr.message ? apiErr.message : JSON.stringify(apiErr);
      return {
        verified: false,
        message: `Failed to fetch payment from Razorpay: ${errMsg}`,
        apiResponse: null,
        error: errMsg
      };
    }
    
    logger.debug('Payment details from Razorpay', {
      id: payment.id,
      order_id: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method
    });

    // Verify payment is successful and matches our order
  if (payment && payment.status === 'captured' && payment.order_id === razorpay_order_id) {
  logger.info('Payment verified via API');
      
  // Update database records
      const result = await prisma.$transaction(async (tx) => {
        // Update order status
        const updatedOrder = await tx.order.update({
          where: { 
            paymentId: razorpay_order_id,
            userId
          },
          data: { 
            payment: true,
            status: 'CONFIRMED'
          },
          include: { 
            items: { include: { product: true } },
            paymentDetails: true 
          }
        });

    // Update payment record
        const updatedPayment = await tx.payment.update({
          where: { razorpayOrderId: razorpay_order_id },
          data: {
            razorpayPaymentId: razorpay_payment_id,
            status: 'SUCCESS',
            method: payment.method || 'online',
      gatewayResponse: payment // Store full payment details
          }
        });

  logger.info('Database updated via API verification');
        return updatedOrder;
      });

      return {
        verified: true,
        message: 'Payment verified successfully via API',
        orderId: result.id,
        orderDetails: result,
        paymentMethod: payment.method
      };
  } else {
      logger.warn('Payment verification failed via API', {
        status: payment.status,
        orderMatches: payment.order_id === razorpay_order_id
      });

      // Mark payment as failed (store truncated gateway response)
      try {
        const gatewayResponseStr = JSON.stringify(payment);
        await prisma.payment.update({
          where: { razorpayOrderId: razorpay_order_id },
          data: {
            status: 'FAILED',
            failureReason: `API verification failed: status=${payment.status}, order_match=${payment.order_id === razorpay_order_id}`,
            gatewayResponse: gatewayResponseStr.length > 10000 ? gatewayResponseStr.substring(0, 10000) + '...TRUNCATED' : gatewayResponseStr
          }
        });
      } catch (dbErr) {
        logger.error('Failed to update payment record after API mismatch', { error: dbErr });
      }

      return {
        verified: false,
        message: `Payment verification failed: status=${payment?.status ?? 'UNKNOWN'}`,
        apiResponse: payment
      };
    }
  } catch (error) {
    logger.error('API-based payment verification error', { message: error.message, stack: error.stack });

    // Try to mark payment as failed (best-effort)
    if (data?.razorpay_order_id) {
      try {
        await prisma.payment.update({
          where: { razorpayOrderId: data.razorpay_order_id },
          data: {
            status: 'FAILED',
            failureReason: `API verification error: ${error.message}`
          }
        });
      } catch (updateError) {
        logger.error('Failed to update payment status after API error', { error: updateError.message || updateError });
      }
    }

    // Return structured failure so controller can include details without crashing
    return {
      verified: false,
      message: `API-based payment verification failed: ${error.message}`,
      apiResponse: null,
      error: error.message
    };
  }
};
