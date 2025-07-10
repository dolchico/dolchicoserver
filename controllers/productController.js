// controllers/productController.js
import { v2 as cloudinary } from 'cloudinary';
import {
  createProduct,
  getAllProducts,
  deleteProductById,
  getProductById,
} from '../services/productService.js';

// ✅ Add Product
const addProduct = async (req, res) => {
  try {
    const { name, description, price, category, subCategory, sizes, bestseller } = req.body;

    const image1 = req.files.image1?.[0];
    const image2 = req.files.image2?.[0];
    const image3 = req.files.image3?.[0];
    const image4 = req.files.image4?.[0];

    const images = [image1, image2, image3, image4].filter(Boolean);

    const imagesUrl = await Promise.all(
      images.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, {
          resource_type: 'image',
        });
        return result.secure_url;
      })
    );

    const productData = {
      name,
      description,
      category,
      price: parseFloat(price),
      subCategory,
      bestseller: bestseller === 'true',
      sizes: JSON.parse(sizes),
      image: imagesUrl,
      date: Date.now(),
    };

    await createProduct(productData);

    res.json({ success: true, message: 'Product Added' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ List Products
// ✅ List Products with BigInt Fix
const listProducts = async (req, res) => {
  try {
    const products = await getAllProducts();

    // Convert BigInt to string for JSON serialization
    const safeProducts = products.map((product) => ({
      ...product,
      date: product.date.toString(), // Convert BigInt → string
    }));

    res.json({ success: true, products: safeProducts });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Remove Product
const removeProduct = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({ success: false, message: 'Product ID is required' });
    }

    // ✅ convert to number
    await deleteProductById(Number(id));

    res.json({ success: true, message: 'Product Removed' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Single Product Info
// ✅ Single Product Info (POST version)
// controllers/productController.js (or wherever singleProduct is defined)

const singleProduct = async (req, res) => {
  try {
    // Assuming your route is productRouter.get('/single/:productId', singleProduct);
    const { productId } = req.params; 

    // CHANGE START: Explicitly check if productId is the string "undefined" or not a valid number
    if (!productId || productId === "undefined" || isNaN(Number(productId))) {
      return res.status(400).json({ success: false, message: 'Invalid or missing product ID provided.' });
    }
    // CHANGE END

    const product = await getProductById(Number(productId)); // Number("undefined") would result in NaN

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // ✅ Safely convert BigInt to string for JSON
    const safeProduct = {
      ...product,
      date: product.date?.toString() || null,
    };

    res.json({ success: true, product: safeProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export { listProducts, addProduct, removeProduct, singleProduct };
