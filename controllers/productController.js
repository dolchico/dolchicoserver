import { v2 as cloudinary } from 'cloudinary';
import { priceUtils, toPrismaDecimal } from '../utils/priceUtils.js';
import {
  createProduct,
  getAllProducts,
  deleteProductById,
  getProductById,
  searchProductsService,
} from '../services/productService.js';

// Utility to convert BigInt fields to numbers for JSON serialization
const convertBigIntFields = (data) => {
  if (data === null || data === undefined) return data;
  
  if (Array.isArray(data)) {
    return data.map(convertBigIntFields);
  }
  
  if (typeof data === 'object') {
    // Handle Prisma Decimal objects
    if (data && typeof data === 'object' && 's' in data && 'e' in data && 'd' in data) {
      // This is a Prisma Decimal, convert to string
      return data.toString();
    }
    const converted = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'bigint') {
        converted[key] = Number(value);
      } else if (typeof value === 'object') {
        converted[key] = convertBigIntFields(value);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }
  
  return typeof data === 'bigint' ? Number(data) : data;
};

// ✅ Add Product - REVISED FOR RELATIONAL SCHEMA
const addProduct = async (req, res) => {
  try {
  // CHANGED: Only require `subcategoryId`. We'll derive `categoryId` server-side to ensure consistency.
  const { name, description, price, subcategoryId, sizes, bestseller, sku, weight, dimensions, tags, seoSlug, compareAtPrice } = req.body;

  // --- Validation for new required fields ---
  if (!subcategoryId) {
    return res.status(400).json({ success: false, message: 'subcategoryId is a required field.' });
  }

    // Expect req.files to be an array of up to 6 files (from multer.array('images', 6))
    const files = Array.isArray(req.files) ? req.files : [];

    // Basic input validation before uploading
    if (!name || !description || !price) {
      return res.status(400).json({ success: false, message: 'Missing required fields: name, description, or price' });
    }

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one image is required.' });
    }

    // Upload buffers to Cloudinary using upload_stream and return secure_url + public_id
    const uploadToCloudinary = (fileBuffer, fileName) => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'products' }, (error, result) => {
        if (error) return reject(error);
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      });
      stream.end(fileBuffer);
    });

    // Validate and upload files (limit to 6)
    const uploadResults = [];
    try {
      for (const file of files.slice(0, 6)) {
        if (!file || !file.buffer) throw new Error('Uploaded file buffer missing');
        const r = await uploadToCloudinary(file.buffer, file.originalname);
        uploadResults.push(r);
      }
    } catch (uploadErr) {
      console.error('Image upload failed:', uploadErr);
      return res.status(500).json({ success: false, message: 'Image upload failed', error: uploadErr.message });
    }

    const imagesUrl = uploadResults.map(r => r.secure_url);
    const uploadedPublicIds = uploadResults.map(r => r.public_id).filter(Boolean);
    
    // CHANGED: Construct productData with subcategoryId only; service will derive categoryId.
    const parseMaybeJsonArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      const strVal = String(val);
      try { return JSON.parse(strVal); } catch (e) { return [strVal]; }
    };

    const productData = {
      name,
      description,
      price: toPrismaDecimal(price),
      bestseller: bestseller === 'true',
      sizes: parseMaybeJsonArray(sizes),
      image: imagesUrl,
      date: Date.now(),
      // New e-commerce fields
      sku,
      weight: weight ? parseFloat(weight) : null,
      dimensions: dimensions ? JSON.parse(dimensions) : null,
      tags: parseMaybeJsonArray(tags),
      seoSlug,
      compareAtPrice: compareAtPrice ? toPrismaDecimal(compareAtPrice) : null,
      // Do not accept categoryId from client. Only pass subcategoryId; service will derive categoryId.
      subcategoryId: Number(subcategoryId), // Ensure it's a number
    };
    // Create product and handle cleanup if creation fails after uploads
    let createdProduct = null;
    try {
      createdProduct = await createProduct(productData);
    } catch (createErr) {
      console.error('Product creation failed, cleaning up uploaded images...', createErr);
      // Attempt to delete uploaded images to avoid orphaned uploads
      await Promise.all(uploadedPublicIds.map(id => new Promise((resolve) => {
        cloudinary.uploader.destroy(id, { resource_type: 'image' }, (err, result) => {
          if (err) console.error('Failed to delete uploaded image', id, err);
          resolve(result);
        });
      })));

      return res.status(500).json({ success: false, message: 'Product creation failed', error: createErr.message });
    }

    // Success
    const serializedProduct = convertBigIntFields({
      ...createdProduct,
      date: createdProduct.date?.toString() || null,
      createdAt: createdProduct.createdAt?.toISOString() || null,
      updatedAt: createdProduct.updatedAt?.toISOString() || null,
    });
    return res.status(201).json({ success: true, message: 'Product Added', product: serializedProduct });
  } catch (error) {
    // Log detailed error for debugging
    console.error('addProduct error:', { name: error?.name, message: error?.message, stack: error?.stack });
    // Return a sanitized message to client
    res.status(500).json({ success: false, message: 'Failed to add product', error: error?.message });
  }
};

// NOTE: This controller now correctly handles the nested category/subcategory objects returned by the service.
const listProducts = async (req, res) => {
  try {
    const products = await getAllProducts();

    // The `products` array now contains full category and subcategory objects.
    // The spread `...product` will correctly include them in the final response.
    const safeProducts = products.map((product) => convertBigIntFields({
      ...product,
      date: product.date?.toString() || null,
      createdAt: product.createdAt?.toISOString() || null,
      updatedAt: product.updatedAt?.toISOString() || null,
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
    const safeProduct = convertBigIntFields({
      ...product,
      date: product.date?.toString() || null,
      createdAt: product.createdAt?.toISOString() || null,
      updatedAt: product.updatedAt?.toISOString() || null,
    });
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
    const { q, page = 1, limit = 20, category, subCategory, minPrice, maxPrice, sortBy = 'relevance', tags } = req.query;
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
        ...(minPrice && { minPrice: toPrismaDecimal(minPrice) }),
        ...(maxPrice && { maxPrice: toPrismaDecimal(maxPrice) }),
        ...(tags && { tags: tags.split(',') }) // Support comma-separated tags
      },
      sortBy
    };
    const searchResult = await searchProductsService(searchParams);
    // The products in searchResult already contain the nested category/subcategory objects.
    const safeProducts = searchResult.products.map((product) => convertBigIntFields({
      ...product,
      date: product.date?.toString() || null,
      createdAt: product.createdAt?.toISOString() || null,
      updatedAt: product.updatedAt?.toISOString() || null,
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
