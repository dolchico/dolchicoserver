import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { razorpayInstance, RAZORPAY_CONFIG } from '../config/razorpay.js';
import { priceUtils } from '../utils/priceUtils.js';

const prisma = new PrismaClient();

/**
 * Create Razorpay order and save to database
 * @param {Object} data - Order data
 * @param {string} data.userId - The ID of the user
 * @param {Array} data.items - Array of items with productId, size, quantity, price
 * @param {number} data.amount - Total order amount
 * @param {Object} data.address - Shipping address
 * @param {Object} [data.notes] - Additional notes
 * @returns {Promise<Object>} Razorpay and database order details
 * @throws {Error} If input is invalid or order creation fails
 */
export const createRazorpayOrder = async (data) => {
  try {
    const { userId, items, amount, address, notes = {} } = data;

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items must be a non-empty array');
    }
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount');
    }
    if (!address || typeof address !== 'object') {
      throw new Error('Invalid address');
    }
    for (const item of items) {
      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        throw new Error(`Invalid product ID: ${item.productId}`);
      }
      if (!item.size || typeof item.size !== 'string') {
        throw new Error('Invalid size for item');
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Invalid quantity for item');
      }
      if (isNaN(item.price) || item.price <= 0) {
        throw new Error('Invalid price for item');
      }
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const amountInPaise = Math.round(priceUtils.toNumber(priceUtils.multiply(amount, 100)));

    // Create order in Razorpay
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: RAZORPAY_CONFIG.currency,
      receipt: `${RAZORPAY_CONFIG.receipt_prefix}${Date.now()}`,
      notes: {
        userId, // Use string userId
        itemCount: items.length.toString(),
        ...notes,
      },
    });

    // Create order in database with pending payment
    const dbOrder = await prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          userId, // Use string userId
          amount,
          address,
          status: 'ORDER_PLACED',
          paymentMethod: 'RAZORPAY',
          payment: false,
          paymentId: razorpayOrder.id,
          date: BigInt(Date.now()),
          items: {
            create: items.map((item) => ({
              productId: Number(item.productId),
              size: item.size,
              quantity: Number(item.quantity),
              price: item.price,
            })),
          },
        },
        include: { items: true },
      });

      // Create detailed payment record
      await tx.payment.create({
        data: {
          razorpayOrderId: razorpayOrder.id,
          amount: amountInPaise,
          currency: razorpayOrder.currency,
          status: 'PENDING',
          orderId: order.id,
          userId, // Use string userId
        },
      });

      return order;
    });

    // Clear user's cart after creating order (uncomment if needed)
    // await prisma.cartItem.deleteMany({
    //   where: { userId }
    // });

    return {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      dbOrderId: dbOrder.id,
      key: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error(`Failed to create payment order: ${error.message}`);
  }
};

/**
 * Create Cash on Delivery (COD) order
 * @param {Object} data - Order data
 * @param {string} data.userId - The ID of the user
 * @param {Array} data.items - Array of items with productId, size, quantity, price
 * @param {number} data.amount - Total order amount
 * @param {Object} data.address - Shipping address
 * @param {Object} [data.notes] - Additional notes
 * @returns {Promise<Object>} Database order details
 * @throws {Error} If input is invalid or order creation fails
 */
export const createCodOrder = async (data) => {
  try {
    const { userId, items, amount, address, notes = {} } = data;
    console.log(amount)

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items must be a non-empty array');
    }
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount');
    }
    if (!address || typeof address !== 'object') {
      throw new Error('Invalid address');
    }
    for (const item of items) {
      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        throw new Error(`Invalid product ID: ${item.productId}`);
      }
      if (!item.size || typeof item.size !== 'string') {
        throw new Error('Invalid size for item');
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Invalid quantity for item');
      }
      if (isNaN(item.price) || item.price <= 0) {
        throw new Error('Invalid price for item');
      }
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const amountInPaise = Math.round(amount * 100);

    // Create order in database with pending payment
    const dbOrder = await prisma.$transaction(async (tx) => {
      // Validate and decrement stock for each item
      for (const item of items) {
        const currentProduct = await tx.product.findUnique({
          where: { id: Number(item.productId) },
        });

        if (!currentProduct) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        if (currentProduct.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}. Available: ${currentProduct.stock}, Required: ${item.quantity}`);
        }

        // Decrement stock
        await tx.product.update({
          where: { id: Number(item.productId) },
          data: { stock: currentProduct.stock - item.quantity },
        });
      }

      // Create the order
      const order = await tx.order.create({
        data: {
          userId, // Use string userId
          amount,
          address,
          status: 'ORDER_PLACED',
          paymentMethod: 'COD',
          payment: true,
          paymentId: `cod_${Date.now()}`,
          date: BigInt(Date.now()),
          items: {
            create: items.map((item) => ({
              productId: Number(item.productId),
              size: item.size,
              quantity: Number(item.quantity),
              price: item.price,
            })),
          },
        },
        include: { items: true },
      });

      console.log('createCodOrder', order);
      return order;
    });

    // Clear user's cart after creating order (uncomment if needed)
    // await prisma.cartItem.deleteMany({
    //   where: { userId }
    // });

    return {
      dbOrderId: dbOrder.id,
    };
  } catch (error) {
    console.error('Error creating COD order:', error);
    throw new Error(`Failed to create COD order: ${error.message}`);
  }
};

/**
 * Verify Razorpay payment signature and complete order
 * @param {Object} data - Payment verification data
 * @param {string} data.razorpay_order_id - Razorpay order ID
 * @param {string} data.razorpay_payment_id - Razorpay payment ID
 * @param {string} data.razorpay_signature - Razorpay signature
 * @param {string} data.userId - The ID of the user
 * @returns {Promise<Object>} Verification result and order details
 * @throws {Error} If verification fails or database operations fail
 */
export const verifyRazorpayPayment = async (data) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = data;

    // Validate inputs
    if (!razorpay_order_id || typeof razorpay_order_id !== 'string') {
      throw new Error('Invalid Razorpay order ID');
    }
    if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string') {
      throw new Error('Invalid Razorpay payment ID');
    }
    if (!razorpay_signature || typeof razorpay_signature !== 'string') {
      throw new Error('Invalid Razorpay signature');
    }
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    console.log('=== PAYMENT VERIFICATION DEBUG ===');
    console.log('Input data:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature ? `${razorpay_signature.substring(0, 10)}...` : 'NULL',
      userId,
    });

    // Check if Razorpay secret is available
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('RAZORPAY_KEY_SECRET environment variable is missing!');
      throw new Error('Payment verification configuration error');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
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
      fullExpectedSignature: expectedSignature,
      fullReceivedSignature: razorpay_signature,
      matches: expectedSignature === razorpay_signature,
    });

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      console.log('✅ Payment signature verified successfully');

      // First, check if the order exists
      const existingOrder = await prisma.order.findFirst({
        where: {
          paymentId: razorpay_order_id,
          userId, // Use string userId
        },
        include: { paymentDetails: true },
      });

      if (!existingOrder) {
        console.error('❌ Order not found for verification:', {
          razorpay_order_id,
          userId,
        });
        throw new Error('Order not found for payment verification');
      }

      console.log('📋 Found order for verification:', {
        orderId: existingOrder.id,
        currentStatus: existingOrder.status,
        currentPaymentStatus: existingOrder.payment,
        paymentDetailsStatus: existingOrder.paymentDetails?.status,
      });

      // Update database records transactionally
      const result = await prisma.$transaction(async (tx) => {
        // Locate the order by paymentId and userId
        let foundOrder = await tx.order.findFirst({
          where: { userId, paymentId: razorpay_order_id }, // Use string userId
          include: {
            items: {
              include: { product: true },
            },
            paymentDetails: true,
          },
        });

        // Fallback: look up Payment record by razorpayOrderId
        if (!foundOrder) {
          const paymentRecord = await tx.payment.findUnique({
            where: { razorpayOrderId: razorpay_order_id },
          });
          if (paymentRecord && paymentRecord.orderId) {
            const orderById = await tx.order.findUnique({
              where: { id: paymentRecord.orderId },
              include: {
                items: { include: { product: true } },
                paymentDetails: true,
              },
            });
            if (orderById && orderById.userId === userId) foundOrder = orderById;
          }
        }

        if (!foundOrder) {
          console.error('❌ Order not found for verification (transaction):', { razorpay_order_id, userId });
          throw new Error('Order not found for payment verification');
        }

        // Idempotency: skip update if already paid/confirmed
        if (foundOrder.payment === true || foundOrder.status === 'CONFIRMED') {
          console.log('ℹ️ Order already confirmed - skipping update', { orderId: foundOrder.id });
          return foundOrder;
        }

        // Validate and decrement stock for each item
        for (const orderItem of foundOrder.items) {
          const currentProduct = await tx.product.findUnique({
            where: { id: orderItem.productId },
          });

          if (!currentProduct) {
            throw new Error(`Product with ID ${orderItem.productId} not found`);
          }

          if (currentProduct.stock < orderItem.quantity) {
            throw new Error(`Insufficient stock for product ${orderItem.productId}. Available: ${currentProduct.stock}, Required: ${orderItem.quantity}`);
          }

          // Decrement stock
          await tx.product.update({
            where: { id: orderItem.productId },
            data: { stock: currentProduct.stock - orderItem.quantity },
          });
        }

        console.log('✅ Stock decremented successfully for all items');

        // Update the order
        const updatedOrder = await tx.order.update({
          where: { id: foundOrder.id },
          data: { payment: true, status: 'CONFIRMED' },
          include: { items: true, paymentDetails: true },
        });

        console.log('📦 Updated order:', {
          orderId: updatedOrder.id,
          newStatus: updatedOrder.status,
          newPaymentStatus: updatedOrder.payment,
        });

        // Update or create payment record
        try {
          const existingPayment = await tx.payment.findFirst({
            where: { razorpayOrderId: razorpay_order_id },
          });
          if (existingPayment) {
            await tx.payment.update({
              where: { id: existingPayment.id },
              data: {
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: 'SUCCESS',
                method: 'online',
              },
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
                userId, // Use string userId
              },
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
        orderDetails: result,
      };
    } else {
      console.log('❌ Payment signature verification failed');

      // Update payment and order status to FAILED
      try {
        await prisma.payment.updateMany({
          where: { razorpayOrderId: razorpay_order_id },
          data: {
            status: 'FAILED',
            failureReason: 'Signature verification failed',
          },
        });

        await prisma.order.updateMany({
          where: { paymentId: razorpay_order_id },
          data: {
            status: 'PAYMENT_FAILED',
            payment: false,
          },
        });

        console.log('📝 Marked payment and order(s) as FAILED in database');
      } catch (updateError) {
        console.error('Failed to update payment/order status to FAILED:', updateError);
      }

      return {
        verified: false,
        message: 'Payment signature verification failed',
      };
    }
  } catch (error) {
    console.error('❌ Payment verification error:', {
      message: error.message,
      stack: error.stack,
      input: {
        razorpay_order_id: data?.razorpay_order_id,
        userId: data?.userId,
      },
    });

    // Try to mark payment and order as failed
    if (data?.razorpay_order_id) {
      try {
        await prisma.payment.updateMany({
          where: { razorpayOrderId: data.razorpay_order_id },
          data: {
            status: 'FAILED',
            failureReason: `Verification error: ${error.message}`,
          },
        });

        await prisma.order.updateMany({
          where: { paymentId: data.razorpay_order_id },
          data: {
            status: 'PAYMENT_FAILED',
            payment: false,
          },
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
 * @param {number} orderId - The ID of the order
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object>} Payment and order details
 * @throws {Error} If order is not found or query fails
 */
export const getOrderPaymentStatus = async (orderId, userId) => {
  try {
    // Validate inputs
    const orderIdNum = Number(orderId);
    if (isNaN(orderIdNum) || orderIdNum <= 0 || !Number.isInteger(orderIdNum)) {
      throw new Error('Invalid order ID');
    }
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        userId, // Use string userId
      },
      include: {
        paymentDetails: true,
        items: { include: { product: true } },
      },
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
      createdAt: order.createdAt,
    };
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw new Error(`Failed to get payment status: ${error.message}`);
  }
};

/**
 * Retry payment for a failed order
 * @param {number} orderId - The ID of the order
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object>} New Razorpay order details
 * @throws {Error} If order is not found, already paid, or retry fails
 */
export const retryFailedPayment = async (orderId, userId) => {
  try {
    // Validate inputs
    const orderIdNum = Number(orderId);
    if (isNaN(orderIdNum) || orderIdNum <= 0 || !Number.isInteger(orderIdNum)) {
      throw new Error('Invalid order ID');
    }
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        userId, // Use string userId
        payment: false,
      },
      include: { items: true },
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
        originalOrderId: orderIdNum.toString(),
        userId, // Use string userId
        retryAttempt: 'true',
      },
    });

    // Update existing payment record
    await prisma.payment.update({
      where: { orderId: orderIdNum },
      data: {
        razorpayOrderId: razorpayOrder.id,
        status: 'PENDING',
        razorpayPaymentId: null,
        razorpaySignature: null,
      },
    });

    // Update order with new Razorpay order ID
    await prisma.order.update({
      where: { id: orderIdNum },
      data: { paymentId: razorpayOrder.id },
    });

    return {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error) {
    console.error('Error retrying payment:', error);
    throw new Error(`Failed to retry payment: ${error.message}`);
  }
};