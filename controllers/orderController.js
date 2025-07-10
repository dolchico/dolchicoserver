import {
  createOrder,
  getAllOrders,
  getUserOrders,
  updateOrderStatus
} from '../services/orderService.js';

/**
 * ✅ Place COD Order
 */
export const placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, amount, address } = req.body;

    const order = await createOrder({
      userId: Number(userId),
      amount: parseFloat(amount),
      address,
      items,
    });

    res.json({ success: true, message: 'Order Placed', orderId: order.id });
  } catch (error) {
    console.error('Place Order Error:', error);
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
    console.error('Get All Orders Error:', error);
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

    // Fix BigInt serialization
    const cleanedOrders = orders.map(order => ({
      ...order,
      date: Number(order.date),
    }));

    res.json({ success: true, orders: cleanedOrders });
  } catch (error) {
    console.error('Get User Orders Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ✅ Update Order Status (Admin)
 */
export const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    await updateOrderStatus(orderId, status);
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('Update Order Status Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
