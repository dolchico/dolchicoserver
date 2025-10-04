import {
    createOrder,
    getAllOrders,
    getUserOrders,
    getSingleOrder,
    updateOrderStatus,
    addToCart,
} from "../services/orderService.js";
import { priceUtils, toPrismaDecimal } from '../utils/priceUtils.js';
import { validate } from 'uuid';
import { BadRequestError } from '../utils/errors.js';

/**
 * Place COD Order
 */
export const placeOrder = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId || !validate(userId)) {
            throw new BadRequestError('Invalid or missing user ID.', 'INVALID_USER_ID');
        }
        const { items, amount, address } = req.body;

        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new BadRequestError("Items are required and must be a non-empty array", 'INVALID_ITEMS');
        }
        if (!amount || amount <= 0) {
            throw new BadRequestError("Amount must be greater than 0", 'INVALID_AMOUNT');
        }
        if (!address) {
            throw new BadRequestError("Address is required", 'INVALID_ADDRESS');
        }

        const order = await createOrder({
            userId, // Keep as string UUID
            amount: toPrismaDecimal(amount),
            address,
            items,
        });

        res.json({
            success: true,
            message: "Order placed successfully and cart cleared",
            orderId: order.id,
            status: order.status,
            orderDetails: order,
        });
    } catch (error) {
        console.error("Place Order Error:", error);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

/**
 * Add Item to Cart
 */
export const addItemToCart = async (req, res) => {
  try {
    console.log('[OrderController] Received req.body:', req.body);
console.log('[OrderController] productId type:', typeof req.body.productId, 'value:', req.body.productId);
    const userId = req.user?.id;
    if (!userId || !validate(userId)) {
      throw new BadRequestError('Invalid or missing user ID.', 'INVALID_USER_ID');
    }

    const { productId, size, quantity = 1 } = req.body;

    // Parse productId to integer (handles string "168" or number 168)
    const productIdNumber = parseInt(productId, 10);
    if (isNaN(productIdNumber) || productIdNumber <= 0) {
      console.log('[OrderController] Invalid productId received:', productId, 'parsed:', productIdNumber);
      throw new BadRequestError("Product ID is required and must be a valid integer", 'INVALID_PRODUCT_ID');
    }

    // Parse quantity to integer
    const quantityNumber = parseInt(quantity, 10);
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      throw new BadRequestError("Quantity must be greater than 0", 'INVALID_QUANTITY');
    }

    if (!size || typeof size !== 'string' || size.trim().length === 0) {
      throw new BadRequestError("Size is required", 'INVALID_SIZE');
    }

    console.log('[OrderController] Adding to cart:', { userId, productId: productIdNumber, size, quantity: quantityNumber });

    const cartItem = await addToCart(userId, productIdNumber, size.trim(), quantityNumber);

    res.json({
      success: true,
      message: "Item added to cart",
      cartItem,
    });
  } catch (error) {
    console.error("Add to Cart Error:", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Get All Orders (Admin)
 */
export const allOrders = async (req, res) => {
    try {
        const orders = await getAllOrders();
        res.json({ success: true, orders });
    } catch (error) {
        console.error("Get All Orders Error:", error);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

/**
 * Get User Orders
 */
export const userOrders = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId || !validate(userId)) {
            throw new BadRequestError('Invalid or missing user ID.', 'INVALID_USER_ID');
        }
        const orders = await getUserOrders(userId); // Keep as string UUID

        res.json({ success: true, orders });
    } catch (error) {
        console.error("Get User Orders Error:", error);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

/**
 * Update Order Status (Admin)
 */
export const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        if (!orderId || isNaN(orderId) || orderId <= 0) {
            throw new BadRequestError("Order ID is required and must be a valid integer", 'INVALID_ORDER_ID');
        }
        if (!status) {
            throw new BadRequestError("Status is required", 'INVALID_STATUS');
        }

        const updatedOrder = await updateOrderStatus(orderId, status);
        res.json({
            success: true,
            message: "Order status updated successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Update Order Status Error:", error);
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

/**
 * Get Single Order
 */
export const getSingleOrderController = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user?.id;

        if (!userId || !validate(userId)) {
            throw new BadRequestError('Invalid or missing user ID.', 'INVALID_USER_ID');
        }
        if (!orderId || orderId === "undefined" || orderId.trim() === "") {
            throw new BadRequestError("Order ID is required", 'INVALID_ORDER_ID');
        }

        const orderIdNumber = parseInt(orderId, 10);
        if (isNaN(orderIdNumber) || orderIdNumber <= 0) {
            throw new BadRequestError("Invalid Order ID format", 'INVALID_ORDER_ID');
        }

        const order = await getSingleOrder(orderIdNumber, userId);

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error("Get Single Order Error:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: "Failed to retrieve order",
            error: error.message,
        });
    }
};