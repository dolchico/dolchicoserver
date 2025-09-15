import {
    createOrder,
    getAllOrders,
    getUserOrders,
    getSingleOrder, // ✅ This is correctly imported
    updateOrderStatus,
    addToCart,
    cancelOrderByUserService,
} from "../services/orderService.js";

/**
 * Cancel Order by User (before shipment)
 */
export const cancelOrderByUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;

        if (!orderId) {
            return res
                .status(400)
                .json({ success: false, message: "Order ID is required" });
        }

        // Call service to cancel order
        const result = await cancelOrderByUserService(
            Number(orderId),
            Number(userId)
        );
        res.json({
            success: true,
            message: "Order cancelled successfully",
            order: result,
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * ✅ Place COD Order
 */
export const placeOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items, amount, address } = req.body;
    try {
        const userId = req.user.id;
        const { items, amount, address } = req.body;

        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items are required and must be a non-empty array",
            });
        }
        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items are required and must be a non-empty array",
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0",
            });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0",
            });
        }

        if (!address) {
            return res.status(400).json({
                success: false,
                message: "Address is required",
            });
        }
        if (!address) {
            return res.status(400).json({
                success: false,
                message: "Address is required",
            });
        }

        const order = await createOrder({
            userId: Number(userId),
            amount: parseFloat(amount),
            address,
            items,
        });
        const order = await createOrder({
            userId: Number(userId),
            amount: parseFloat(amount),
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
        res.status(500).json({ success: false, message: error.message });
    }
        res.json({
            success: true,
            message: "Order placed successfully and cart cleared",
            orderId: order.id,
            status: order.status,
            orderDetails: order,
        });
    } catch (error) {
        console.error("Place Order Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * ✅ Add Item to Cart
 */
export const addItemToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, size, quantity = 1 } = req.body;
    try {
        const userId = req.user.id;
        const { productId, size, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }

        if (!size) {
            return res.status(400).json({
                success: false,
                message: "Size is required",
            });
        }
        if (!size) {
            return res.status(400).json({
                success: false,
                message: "Size is required",
            });
        }

        const cartItem = await addToCart(userId, productId, size, quantity);

        res.json({
            success: true,
            message: "Item added to cart",
            cartItem,
        });
    } catch (error) {
        console.error("Add to Cart Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
        const cartItem = await addToCart(userId, productId, size, quantity);

        res.json({
            success: true,
            message: "Item added to cart",
            cartItem,
        });
    } catch (error) {
        console.error("Add to Cart Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * ✅ Get All Orders (Admin)
 */
export const allOrders = async (req, res) => {
    try {
        const orders = await getAllOrders();
        res.json({ success: true, orders });
    } catch (error) {
        console.error("Get All Orders Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
    try {
        const orders = await getAllOrders();
        res.json({ success: true, orders });
    } catch (error) {
        console.error("Get All Orders Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * ✅ Get User Orders
 */
export const userOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await getUserOrders(Number(userId));
    try {
        const userId = req.user.id;
        const orders = await getUserOrders(Number(userId));

        res.json({ success: true, orders });
    } catch (error) {
        console.error("Get User Orders Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
        res.json({ success: true, orders });
    } catch (error) {
        console.error("Get User Orders Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * ✅ Update Order Status (Admin)
 */
export const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
    try {
        const { orderId, status } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required",
            });
        }
        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required",
            });
        }

        const updatedOrder = await updateOrderStatus(orderId, status);
        res.json({
            success: true,
            message: "Order status updated successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Update Order Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
        const updatedOrder = await updateOrderStatus(orderId, status);
        res.json({
            success: true,
            message: "Order status updated successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Update Order Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ FIXED: Use getSingleOrder instead of getOrderById
export const getSingleOrderController = async (req, res) => {
    // ✅ Debug logging - Add these lines
    console.log("=== DEBUG INFO ===");
    console.log("Full req.params:", req.params);
    console.log("orderId raw:", req.params.orderId);
    console.log("orderId type:", typeof req.params.orderId);
    console.log("URL path:", req.path);
    console.log("Full URL:", req.originalUrl);
    console.log("==================");

    try {
        const { orderId } = req.params;
        const userId = req.user?.id;

        if (!orderId || orderId === "undefined" || orderId.trim() === "") {
            console.log("❌ OrderId validation failed:", orderId);
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }
        if (!orderId || orderId === "undefined" || orderId.trim() === "") {
            console.log("❌ OrderId validation failed:", orderId);
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }

        // Remove the problematic validation temporarily
        const orderIdNumber = Number(orderId);
        console.log("Parsed orderId:", orderIdNumber);
        // Remove the problematic validation temporarily
        const orderIdNumber = Number(orderId);
        console.log("Parsed orderId:", orderIdNumber);

        if (isNaN(orderIdNumber) || orderIdNumber <= 0) {
            console.log("❌ OrderId number validation failed:", orderIdNumber);
            return res.status(400).json({
                success: false,
                message: "Invalid Order ID format",
            });
        }
        if (isNaN(orderIdNumber) || orderIdNumber <= 0) {
            console.log("❌ OrderId number validation failed:", orderIdNumber);
            return res.status(400).json({
                success: false,
                message: "Invalid Order ID format",
            });
        }

        const order = await getSingleOrder(orderIdNumber, userId);
        const order = await getSingleOrder(orderIdNumber, userId);

        res.status(200).json({
            success: true,
            order: order,
        });
    } catch (error) {
        console.error("Get Single Order Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve order",
            error: error.message,
        });
    }
        res.status(200).json({
            success: true,
            order: order,
        });
    } catch (error) {
        console.error("Get Single Order Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve order",
            error: error.message,
        });
    }
};
