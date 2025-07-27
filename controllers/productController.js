// controllers/productController.js
import { v2 as cloudinary } from 'cloudinary';
import {
  createProduct,
  getAllProducts,
  deleteProductById,
  getProductById,
  searchProductsService, // Add this import
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

const singleProduct = async (req, res) => {
  try {
    const { productId } = req.params; 

    // CHANGE START: Explicitly check if productId is the string "undefined" or not a valid number
    if (!productId || productId === "undefined" || isNaN(Number(productId))) {
      return res.status(400).json({ success: false, message: 'Invalid or missing product ID provided.' });
    }

    const product = await getProductById(Number(productId)); // Number("undefined") would result in NaN

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

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

// ✅ Search Products - Updated for Prisma/PostgreSQL
const searchProducts = async (req, res) => {
  try {
    const { 
      q, 
      page = 1, 
      limit = 20, 
      category, 
      subCategory, 
      minPrice, 
      maxPrice, 
      sortBy = 'relevance' 
    } = req.query;
    
    // Validate search query
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Search query is required" 
      });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters"
      });
    }

    // Build search parameters
    const searchParams = {
      query: q.trim(),
      page: pageNum,
      limit: limitNum,
      filters: {
        ...(category && { category }),
        ...(subCategory && { subCategory }),
        ...(minPrice && { minPrice: parseFloat(minPrice) }),
        ...(maxPrice && { maxPrice: parseFloat(maxPrice) })
      },
      sortBy
    };

    // Call service layer
    const searchResult = await searchProductsService(searchParams);

    // Convert BigInt dates to strings for JSON serialization
    const safeProducts = searchResult.products.map((product) => ({
      ...product,
      date: product.date?.toString() || null,
    }));

    // Return successful response
    res.json({ 
      success: true, 
      data: {
        products: safeProducts,
        pagination: searchResult.pagination,
        metadata: searchResult.metadata
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    
    // Return appropriate error response
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Internal server error during search" 
    });
  }
};

export { listProducts, addProduct, removeProduct, singleProduct, searchProducts };
