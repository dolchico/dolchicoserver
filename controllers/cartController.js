import {
  addToCartService,
  updateCartService,
  getCartService
} from '../services/cartService.js';

const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, size } = req.body;
    await addToCartService({ userId, itemId, size });
    res.json({ success: true, message: 'Added to cart' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, size, quantity } = req.body;
    await updateCartService({ userId, itemId, size, quantity });
    res.json({ success: true, message: 'Cart updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const getUserCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cartData = await getCartService(userId);
    res.json({ success: true, cartData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export default getUserCart;


export { addToCart, updateCart, getUserCart };
