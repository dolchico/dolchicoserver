import { razorpayInstance } from '../config/razorpay.js';
import prisma from '../lib/prisma.js';

/**
 * Alternative payment verification using Razorpay API
 * This bypasses signature verification and directly checks with Razorpay
 */
export const verifyPaymentWithAPI = async (data) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, userId } = data;

    console.log('=== API-BASED PAYMENT VERIFICATION ===');
    console.log('Input data:', {
      razorpay_order_id,
      razorpay_payment_id,
      userId
    });

    // Fetch payment details from Razorpay API
    const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
    
    console.log('Payment details from Razorpay:', {
      id: payment.id,
      order_id: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method
    });

    // Verify payment is successful and matches our order
    if (payment.status === 'captured' && payment.order_id === razorpay_order_id) {
      console.log('✅ Payment verified via API');
      
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

        console.log('✅ Database updated via API verification');
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
      console.log('❌ Payment verification failed via API:', {
        status: payment.status,
        orderMatches: payment.order_id === razorpay_order_id
      });

      // Mark payment as failed
      await prisma.payment.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: { 
          status: 'FAILED',
          failureReason: `API verification failed: status=${payment.status}, order_match=${payment.order_id === razorpay_order_id}`,
          gatewayResponse: payment
        }
      });

      return { 
        verified: false, 
        message: `Payment verification failed: status=${payment.status}`,
        apiResponse: payment
      };
    }
  } catch (error) {
    console.error('❌ API-based payment verification error:', error);
    
    // Try to mark payment as failed
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
        console.error('Failed to update payment status after API error:', updateError);
      }
    }
    
    throw new Error(`API-based payment verification failed: ${error.message}`);
  }
};
