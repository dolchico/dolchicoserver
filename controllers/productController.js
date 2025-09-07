import { v2 as cloudinary } from 'cloudinary';
import {
  createProduct,
  getAllProducts,
  deleteProductById,
  getProductById,
  searchProductsService,
} from '../services/productService.js';

// ✅ Add Product - REVISED FOR RELATIONAL SCHEMA
const addProduct = async (req, res) => {
  try {
    // CHANGED: Destructure categoryId and subcategoryId instead of names.
    const { name, description, price, categoryId, subcategoryId, sizes, bestseller } = req.body;

    // --- Validation for new required fields ---
    if (!categoryId || !subcategoryId) {
        return res.status(400).json({ success: false, message: 'categoryId and subcategoryId are required fields.' });
    }

    const image1 = req.files.image1?.[0];
    const image2 = req.files.image2?.[0];
    const image3 = req.files.image3?.[0];
    const image4 = req.files.image4?.[0];

    const images = [image1, image2, image3, image4].filter(Boolean);

    if (images.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one image is required.' });
    }

    const imagesUrl = await Promise.all(
      images.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
        return result.secure_url;
      })
    );
    
    // CHANGED: Construct productData with categoryId and subcategoryId for the service.
    const productData = {
      name,
      description,
      price: parseFloat(price),
      bestseller: bestseller === 'true',
      sizes: JSON.parse(sizes),
      image: imagesUrl,
      date: Date.now(),
      categoryId: Number(categoryId), // Ensure it's a number
      subcategoryId: Number(subcategoryId), // Ensure it's a number
    };

    await createProduct(productData);

    res.json({ success: true, message: 'Product Added' });
  } catch (error)
 {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// NOTE: This controller now correctly handles the nested category/subcategory objects returned by the service.
const listProducts = async (req, res) => {
  try {
    const products = await getAllProducts();

    // The `products` array now contains full category and subcategory objects.
    // The spread `...product` will correctly include them in the final response.
    const safeProducts = products.map((product) => ({
      ...product,
      date: product.date.toString(),
    }));

    res.json({ success: true, products: safeProducts });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// NOTE: No changes needed here as it operates on the product ID only.
const removeProduct = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.json({ success: false, message: 'Product ID is required' });
    }
    await deleteProductById(Number(id));
    res.json({ success: true, message: 'Product Removed' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// NOTE: This controller now correctly handles the nested category/subcategory objects returned by the service.
const singleProduct = async (req, res) => {
  try {
    const { productId } = req.params; 
    if (!productId || productId === "undefined" || isNaN(Number(productId))) {
      return res.status(400).json({ success: false, message: 'Invalid or missing product ID provided.' });
    }
    const product = await getProductById(Number(productId));
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    // The `product` object now includes nested category/subcategory data.
    // The spread operator includes it in the response automatically.
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

// NOTE: No changes needed here. The service layer was updated to handle relational searching,
// so the controller can still pass category names as filters.
const searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 20, category, subCategory, minPrice, maxPrice, sortBy = 'relevance' } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }
    const searchParams = {
      query: q.trim(),
      page: parseInt(page),
      limit: parseInt(limit),
      filters: {
        ...(category && { category }),
        ...(subCategory && { subCategory }),
        ...(minPrice && { minPrice: parseFloat(minPrice) }),
        ...(maxPrice && { maxPrice: parseFloat(maxPrice) })
      },
      sortBy
    };
    const searchResult = await searchProductsService(searchParams);
    // The products in searchResult already contain the nested category/subcategory objects.
    const safeProducts = searchResult.products.map((product) => ({
      ...product,
      date: product.date?.toString() || null,
    }));
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
    res.status(500).json({ success: false, message: "Internal server error during search" });
  }
};

export { listProducts, addProduct, removeProduct, singleProduct, searchProducts };
