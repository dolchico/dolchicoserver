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
    // await prisma.cartItem.deleteMany({
    //   where: { userId }
    // });

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
export const createCodOrder = async (data) => {
  try {
    const { userId, items, amount, address, notes = {} } = data;
    const amountInPaise = Math.round(amount * 100);

    // Create order in database with pending payment
    const dbOrder = await prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          userId,
          amount,
          address,
          status: 'ORDER_PLACED',
          paymentMethod: 'COD',
          payment: true, // Keep existing boolean for compatibility
          paymentId: "randomxyz", // Store Razorpay order ID
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
      console.log("createCodOrder",order);
      return order;
    });

    // Clear user's cart after creating order
    // await prisma.cartItem.deleteMany({
    //   where: { userId }
    // });
    return {
      dbOrderId: dbOrder.id,
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

    console.log('=== PAYMENT VERIFICATION DEBUG ===');
    console.log('Input data:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature ? `${razorpay_signature.substring(0, 10)}...` : 'NULL',
      userId
    });

    // Check if Razorpay secret is available
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('RAZORPAY_KEY_SECRET environment variable is missing!');
      throw new Error('Payment verification configuration error');
    }

    // Generate expected signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    console.log('Signature verification:', {
      body,
      secretKeyLength: process.env.RAZORPAY_KEY_SECRET?.length,
      expectedSignature: `${expectedSignature.substring(0, 10)}...`,
      receivedSignature: razorpay_signature ? `${razorpay_signature.substring(0, 10)}...` : 'NULL',
      fullExpectedSignature: expectedSignature, // Full signature for debugging
      fullReceivedSignature: razorpay_signature, // Full signature for debugging
      matches: expectedSignature === razorpay_signature
    });

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      console.log('✅ Payment signature verified successfully');
      
      // First, check if the order exists
      const existingOrder = await prisma.order.findFirst({
        where: { 
          paymentId: razorpay_order_id,
          userId
        },
        include: { paymentDetails: true }
      });

      if (!existingOrder) {
        console.error('❌ Order not found for verification:', {
          razorpay_order_id,
          userId
        });
        throw new Error('Order not found for payment verification');
      }

      console.log('📋 Found order for verification:', {
        orderId: existingOrder.id,
        currentStatus: existingOrder.status,
        currentPaymentStatus: existingOrder.payment,
        paymentDetailsStatus: existingOrder.paymentDetails?.status
      });

      // Update database records transactionally. Use findFirst to locate the order (non-unique),
      // then update by unique id to avoid Prisma WhereUniqueInput errors.
      const result = await prisma.$transaction(async (tx) => {
        // First try to locate the order by paymentId stored on the order
        let foundOrder = await tx.order.findFirst({
          where: { userId, paymentId: razorpay_order_id },
          include: { paymentDetails: true }
        });

        // Fallback: look up Payment record by razorpayOrderId and then fetch the order by orderId
        if (!foundOrder) {
          const paymentRecord = await tx.payment.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
          if (paymentRecord && paymentRecord.orderId) {
            const orderById = await tx.order.findUnique({ where: { id: paymentRecord.orderId }, include: { paymentDetails: true } });
            if (orderById && orderById.userId === userId) foundOrder = orderById;
          }
        }

        if (!foundOrder) {
          console.error('❌ Order not found for verification (transaction):', { razorpay_order_id, userId });
          throw new Error('Order not found for payment verification');
        }

        // Idempotency: if already paid/confirmed, return existing order without updating
        if (foundOrder.payment === true || foundOrder.status === 'CONFIRMED') {
          console.log('ℹ️ Order already confirmed - skipping update', { orderId: foundOrder.id });
          return foundOrder;
        }

        // Update the order by unique id
        const updatedOrder = await tx.order.update({
          where: { id: foundOrder.id },
          data: { payment: true, status: 'CONFIRMED' },
          include: { items: { include: { product: true } }, paymentDetails: true }
        });

        console.log('📦 Updated order:', {
          orderId: updatedOrder.id,
          newStatus: updatedOrder.status,
          newPaymentStatus: updatedOrder.payment
        });

        // Update or create payment record linked to the order
        try {
          const existingPayment = await tx.payment.findFirst({ where: { razorpayOrderId: razorpay_order_id } });
          if (existingPayment) {
            await tx.payment.update({
              where: { id: existingPayment.id },
              data: {
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: 'SUCCESS',
                method: 'online'
              }
            });
          } else {
            await tx.payment.create({
              data: {
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                amount: Math.round((updatedOrder.amount || 0) * 100),
                currency: 'INR',
                status: 'SUCCESS',
                method: 'online',
                orderId: updatedOrder.id,
                userId
              }
            });
          }
        } catch (payErr) {
          console.error('Failed to update/create payment record in transaction:', payErr);
        }

        return updatedOrder;
      });

      console.log('✅ Payment verification completed successfully');
      
      return { 
        verified: true, 
        message: 'Payment verified successfully',
        orderId: result.id,
        orderDetails: result
      };
    } else {
      console.log('❌ Payment signature verification failed');

      // Try to find and update payment record and mark order as payment-failed
      try {
        // Update payment record if exists
        await prisma.payment.updateMany({
          where: { razorpayOrderId: razorpay_order_id },
          data: { 
            status: 'FAILED',
            failureReason: 'Signature verification failed'
          }
        });

        // Also update the linked order(s) to indicate payment failure
        // Some orders store paymentId as razorpay order id in paymentId field
        await prisma.order.updateMany({
          where: { paymentId: razorpay_order_id },
          data: {
            status: 'PAYMENT_FAILED',
            payment: false
          }
        });

        console.log('📝 Marked payment and order(s) as FAILED in database');
      } catch (updateError) {
        console.error('Failed to update payment/order status to FAILED:', updateError);
      }

      return { 
        verified: false, 
        message: 'Payment signature verification failed'
      };
    }
  } catch (error) {
    console.error('❌ Payment verification error:', {
      message: error.message,
      stack: error.stack,
      input: {
        razorpay_order_id: data?.razorpay_order_id,
        userId: data?.userId
      }
    });
    
    // Try to mark payment and order as failed if we have the razorpay order id
    if (data?.razorpay_order_id) {
      try {
        await prisma.payment.updateMany({
          where: { razorpayOrderId: data.razorpay_order_id },
          data: {
            status: 'FAILED',
            failureReason: `Verification error: ${error.message}`
          }
        });

        await prisma.order.updateMany({
          where: { paymentId: data.razorpay_order_id },
          data: {
            status: 'PAYMENT_FAILED',
            payment: false
          }
        });
      } catch (updateError) {
        console.error('Failed to update payment/order status after error:', updateError);
      }
    }
    
    throw new Error(`Payment verification failed: ${error.message}`);
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
