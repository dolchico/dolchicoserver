import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { razorpayInstance, RAZORPAY_CONFIG } from '../config/razorpay.js';

const prisma = new PrismaClient();

/**
 * Create Razorpay order and save to database
 */
export const createRazorpayOrder = async (data) => {
  try {
    const { userId, items, amount, address, notes = {} } = data;
    const amountInPaise = Math.round(amount * 100);

    // Create order in Razorpay
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: RAZORPAY_CONFIG.currency,
      receipt: `${RAZORPAY_CONFIG.receipt_prefix}${Date.now()}`,
      notes: {
        userId: userId.toString(),
        itemCount: items.length.toString(),
        ...notes
      },
    });

    // Create order in database with pending payment
    const dbOrder = await prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          userId,
          amount,
          address,
          status: 'ORDER_PLACED',
          paymentMethod: 'RAZORPAY',
          payment: false, // Keep existing boolean for compatibility
          paymentId: razorpayOrder.id, // Store Razorpay order ID
          date: BigInt(Date.now()),
          items: {
            create: items.map(item => ({
              productId: item.productId,
              size: item.size,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: { items: true }
      });

      // Create detailed payment record
      await tx.payment.create({
        data: {
          razorpayOrderId: razorpayOrder.id,
          amount: amountInPaise,
          currency: razorpayOrder.currency,
          status: 'PENDING',
          orderId: order.id,
          userId
        }
      });

      return order;
    });

    // Clear user's cart after creating order
    await prisma.cartItem.deleteMany({
      where: { userId }
    });

    return {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      dbOrderId: dbOrder.id,
      key: process.env.RAZORPAY_KEY_ID // Frontend needs this
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error('Failed to create payment order');
  }
};

/**
 * Verify Razorpay payment signature and complete order
 */
export const verifyRazorpayPayment = async (data) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = data;

    // Generate expected signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Update database records
      const result = await prisma.$transaction(async (tx) => {
        // Update order status
        const updatedOrder = await tx.order.update({
          where: { 
            paymentId: razorpay_order_id,
            userId // Ensure user owns this order
          },
          data: { 
            payment: true, // Keep existing boolean field
            status: 'CONFIRMED' // Update order status
          },
          include: { 
            items: { include: { product: true } },
            paymentDetails: true 
          }
        });

        // Update payment record
        await tx.payment.update({
          where: { razorpayOrderId: razorpay_order_id },
          data: {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            status: 'SUCCESS',
            method: 'online' // You can enhance this with actual payment method
          }
        });

        return updatedOrder;
      });

      return { 
        verified: true, 
        message: 'Payment verified successfully',
        orderId: result.id,
        orderDetails: result
      };
    } else {
      // Mark payment as failed
      await prisma.payment.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: { status: 'FAILED' }
      });

      return { 
        verified: false, 
        message: 'Payment verification failed' 
      };
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw new Error('Payment verification failed');
  }
};

/**
 * Get payment status for an order
 */
export const getOrderPaymentStatus = async (orderId, userId) => {
  try {
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        userId // Ensure user owns this order
      },
      include: { 
        paymentDetails: true,
        items: { include: { product: true } }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return {
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: order.paymentDetails?.status || 'PENDING',
      paymentMethod: order.paymentMethod,
      isPaid: order.payment,
      amount: order.amount,
      razorpayOrderId: order.paymentId,
      razorpayPaymentId: order.paymentDetails?.razorpayPaymentId,
      items: order.items,
      address: order.address,
      createdAt: order.createdAt
    };
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw new Error('Failed to get payment status');
  }
};

/**
 * Retry payment for a failed order
 */
export const retryFailedPayment = async (orderId, userId) => {
  try {
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        userId,
        payment: false // Only allow retry for unpaid orders
      },
      include: { items: true }
    });

    if (!order) {
      throw new Error('Order not found or already paid');
    }

    const amountInPaise = Math.round(order.amount * 100);

    // Create new Razorpay order
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: RAZORPAY_CONFIG.currency,
      receipt: `${RAZORPAY_CONFIG.receipt_prefix}retry_${Date.now()}`,
      notes: {
        originalOrderId: orderId.toString(),
        userId: userId.toString(),
        retryAttempt: 'true'
      },
    });

    // Update existing payment record
    await prisma.payment.update({
      where: { orderId },
      data: {
        razorpayOrderId: razorpayOrder.id,
        status: 'PENDING',
        razorpayPaymentId: null,
        razorpaySignature: null
      }
    });

    // Update order with new Razorpay order ID
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentId: razorpayOrder.id }
    });

    return {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID
    };
  } catch (error) {
    console.error('Error retrying payment:', error);
    throw new Error('Failed to retry payment');
  }
};
