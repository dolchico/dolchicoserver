// controllers/productController.js
import { v2 as cloudinary } from 'cloudinary';
import { priceUtils, toPrismaDecimal } from '../utils/priceUtils.js';
import {
  createProduct,
  getProducts, // Updated from getAllProducts
  deleteProductById,
  getProductById,
  searchProductsService,
} from '../services/productService.js';
import prisma from '../lib/prisma.js'; // For direct Prisma access in bulk logic
import { generateProductSlug } from '../utils/seoUtils.js';
import { generateSKU } from '../utils/inventoryUtils.js';

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

// ✅ Add Product - Overloaded for both single and bulk (JSON with products array)
const addProduct = async (req, res) => {
  try {
    // Check if this is a bulk add (JSON body with 'products' array or direct array)
    let rawProducts;
    if (Array.isArray(req.body)) {
      rawProducts = req.body;
    } else {
      rawProducts = req.body.products;
    }
    if (rawProducts && Array.isArray(rawProducts) && rawProducts.length > 0) {
      // Bulk add logic
      console.log(`Starting bulk import of ${rawProducts.length} products...`);

      const createdProducts = [];
      const errors = [];
      let successCount = 0;
      let errorCount = 0;

      for (const rawProd of rawProducts) {
        try {
          // Basic validation per product
          if (!rawProd.name || !rawProd.description || !rawProd.price || !rawProd.subcategoryId) {
            throw new Error('Missing required fields: name, description, price, or subcategoryId');
          }

          // Handle price logic: Keep original price, set discountedPrice if provided
          const currentPrice = toPrismaDecimal(rawProd.price);
          const discountedPrice = rawProd.discountedPrice ? toPrismaDecimal(rawProd.discountedPrice) : null;
          const compareAtPrice = rawProd.compareAtPrice ? toPrismaDecimal(rawProd.compareAtPrice) : currentPrice;

          // Prepare product data (map schema-compatible fields)
          const productData = {
            name: rawProd.name,
            description: rawProd.description,
            price: currentPrice,
            discountedPrice,
            discountPercent: rawProd.discountPercent,
            ageGroupStart: rawProd.ageGroupStart,
            ageGroupEnd: rawProd.ageGroupEnd,
            brand: rawProd.brand,
            color: Array.isArray(rawProd.color) ? rawProd.color : [],
            image: Array.isArray(rawProd.image) ? rawProd.image : [],
            sizes: Array.isArray(rawProd.sizes) ? rawProd.sizes : [],
            bestseller: !!rawProd.bestseller,
            isActive: !!rawProd.isActive,
            stock: rawProd.stock || 0,
            date: BigInt(rawProd.date || Date.now()),
            tags: Array.isArray(rawProd.tags) ? rawProd.tags : [],
            averageRating: rawProd.averageRating || 0,
            reviewsCount: rawProd.reviewsCount || 0,
            sku: rawProd.sku, // Let service generate if undefined
            weight: rawProd.weight ? toPrismaDecimal(rawProd.weight) : null,
            dimensions: rawProd.dimensions,
            seoSlug: rawProd.seoSlug, // Let service generate if undefined
            compareAtPrice,
            subcategoryId: Number(rawProd.subcategoryId), // Ensure it's a number
            // categoryId is derived from subcategoryId in the service
          };

          // Create the product via service (which derives categoryId and generates SKU/slug if needed)
          const createdProduct = await createProduct(productData);

          // Serialize for response
          const serializedProduct = convertBigIntFields({
            ...createdProduct,
            date: createdProduct.date?.toString() || null,
            createdAt: createdProduct.createdAt?.toISOString() || null,
            updatedAt: createdProduct.updatedAt?.toISOString() || null,
          });

          createdProducts.push(serializedProduct);
          successCount++;
          console.log(`✅ Imported product: ${createdProduct.name} (ID: ${createdProduct.id})`);

        } catch (err) {
          errorCount++;
          errors.push({ product: rawProd.name || 'Unknown', error: err.message });
          console.error(`❌ Failed to import ${rawProd.name || 'Unknown'}: ${err.message}`);
        }
      }

      // Response for bulk
      const response = {
        success: errorCount === 0,
        message: `Bulk import complete! Success: ${successCount}, Errors: ${errorCount}`,
        products: createdProducts,
        errors, // Include errors for debugging
      };

      return res.status(response.success ? 201 : 207).json(response); // 207 Multi-Status for partial success

    } else {
      // Single add logic (with file uploads)
      // CHANGED: Only require `subcategoryId`. We'll derive `categoryId` server-side to ensure consistency.
      const { name, description, price, subcategoryId, sizes, bestseller, sku, weight, dimensions, tags, seoSlug, compareAtPrice, discountedPrice, discountPercent, ageGroupStart, ageGroupEnd, brand, color, averageRating, reviewsCount, stock } = req.body;

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
        discountedPrice: discountedPrice ? toPrismaDecimal(discountedPrice) : null,
        discountPercent: discountPercent ? parseInt(discountPercent) : null,
        ageGroupStart: ageGroupStart ? parseInt(ageGroupStart) : null,
        ageGroupEnd: ageGroupEnd ? parseInt(ageGroupEnd) : null,
        brand,
        color: parseMaybeJsonArray(color),
        bestseller: bestseller === 'true',
        sizes: parseMaybeJsonArray(sizes),
        image: imagesUrl,
        stock: stock ? parseInt(stock) : 0,
        date: Date.now(),
        // New e-commerce fields
        sku,
        weight: weight ? toPrismaDecimal(weight) : null,
        dimensions: dimensions ? JSON.parse(dimensions) : null,
        tags: parseMaybeJsonArray(tags),
        averageRating: averageRating ? parseFloat(averageRating) : 0,
        reviewsCount: reviewsCount ? parseInt(reviewsCount) : 0,
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

      // Success for single
      const serializedProduct = convertBigIntFields({
        ...createdProduct,
        date: createdProduct.date?.toString() || null,
        createdAt: createdProduct.createdAt?.toISOString() || null,
        updatedAt: createdProduct.updatedAt?.toISOString() || null,
      });
      return res.status(201).json({ success: true, message: 'Product Added', product: serializedProduct });
    }
  } catch (error) {
    // Log detailed error for debugging
    console.error('addProduct error:', { name: error?.name, message: error?.message, stack: error?.stack });
    // Return a sanitized message to client
    res.status(500).json({ success: false, message: 'Failed to add product', error: error?.message });
  }
};

// Updated listProducts to support filtering and pagination
const listProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      categoryId, 
      subcategoryId, 
      grouping 
    } = req.query;

    const result = await getProducts({ 
      page: +page, 
      limit: +limit, 
      search: search ? search.toString() : '', 
      categoryId: categoryId ? +categoryId : undefined, 
      subcategoryId: subcategoryId ? +subcategoryId : undefined, 
      grouping: grouping ? grouping.toString() : undefined 
    });

    const safeProducts = result.products.map((product) => convertBigIntFields({
      ...product,
      date: product.date?.toString() || null,
      createdAt: product.createdAt?.toISOString() || null,
      updatedAt: product.updatedAt?.toISOString() || null,
    }));

    res.json({ 
      success: true, 
      products: safeProducts,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.error('listProducts error:', error);
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
    console.error('removeProduct error:', error);
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

// Updated controllers/productController.js - Add this at the end before the export
// ✅ Update Product - Handles both text fields and image uploads
const updateProduct = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const productId = Number(id);
    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    // Fetch existing product to get current images and validate
    const existingProduct = await getProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Parse form data fields
    const {
      name,
      description,
      price,
      discountedPrice,
      discountPercent,
      ageGroupStart,
      ageGroupEnd,
      brand,
      color,
      sizes,
      bestseller,
      stock,
      sku,
      weight,
      dimensions,
      tags,
      averageRating,
      reviewsCount,
      seoSlug,
      compareAtPrice,
      categoryId,
      subcategoryId,
    } = req.body;

    // Validation
    if (!name || !description || !price) {
      return res.status(400).json({ success: false, message: 'Missing required fields: name, description, or price' });
    }

    // Handle subcategoryId and derive categoryId if provided
    let finalCategoryId = existingProduct.categoryId;
    let finalSubcategoryId = existingProduct.subcategoryId;
    if (subcategoryId) {
      const subIdNum = Number(subcategoryId);
      if (!isNaN(subIdNum) && subIdNum > 0) {
        const sub = await prisma.subcategory.findUnique({ 
          where: { id: subIdNum },
          select: { id: true, categoryId: true }
        });
        if (sub) {
          finalSubcategoryId = subIdNum;
          finalCategoryId = sub.categoryId;
        } else {
          return res.status(400).json({ success: false, message: 'Invalid subcategoryId' });
        }
      }
    }

    // Parse arrays
    const parseMaybeJsonArray = (val) => {
      if (!val) return [];
      try {
        return JSON.parse(val);
      } catch (e) {
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
    };

    const parsedColor = parseMaybeJsonArray(color);
    const parsedSizes = parseMaybeJsonArray(sizes);
    const parsedTags = parseMaybeJsonArray(tags);

    // Parse dimensions
    let parsedDimensions = existingProduct.dimensions;
    if (dimensions) {
      try {
        parsedDimensions = JSON.parse(dimensions);
      } catch (e) {
        console.error('Invalid dimensions JSON:', e);
      }
    }

    // Prepare update data
    const updateData = {
      name,
      description,
      price: toPrismaDecimal(price),
      brand,
      color: parsedColor,
      sizes: parsedSizes,
      tags: parsedTags,
      bestseller: bestseller === 'true',
      stock: parseInt(stock) || 0,
      sku: sku || existingProduct.sku,
      seoSlug: seoSlug || existingProduct.seoSlug,
      averageRating: parseFloat(averageRating) || 0,
      reviewsCount: parseInt(reviewsCount) || 0,
      subcategoryId: finalSubcategoryId,
      categoryId: finalCategoryId,
    };

    // Optional fields
    if (discountedPrice) updateData.discountedPrice = toPrismaDecimal(discountedPrice);
    if (discountPercent) updateData.discountPercent = parseInt(discountPercent);
    if (ageGroupStart) updateData.ageGroupStart = parseInt(ageGroupStart);
    if (ageGroupEnd) updateData.ageGroupEnd = parseInt(ageGroupEnd);
    if (weight) updateData.weight = toPrismaDecimal(weight);
    if (parsedDimensions) updateData.dimensions = parsedDimensions;
    if (compareAtPrice) updateData.compareAtPrice = toPrismaDecimal(compareAtPrice);

    // Handle image updates
    let currentImages = existingProduct.image || [];
    const uploadedPublicIdsToDelete = []; // Track old images to delete if replaced

    if (req.files && req.files.length > 0) {
      const files = Array.isArray(req.files) ? req.files : [];
      const uploadToCloudinary = (fileBuffer, fileName) => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'products' }, (error, result) => {
          if (error) return reject(error);
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        });
        stream.end(fileBuffer);
      });

      const newUploadResults = [];
      try {
        for (const file of files.slice(0, 6 - currentImages.length)) { // Allow up to 6 total
          if (!file || !file.buffer) throw new Error('Uploaded file buffer missing');
          const r = await uploadToCloudinary(file.buffer, file.originalname);
          newUploadResults.push(r.secure_url);
        }
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr);
        return res.status(500).json({ success: false, message: 'Image upload failed', error: uploadErr.message });
      }

      // Append new images to existing
      currentImages = [...currentImages, ...newUploadResults];
      updateData.image = currentImages;
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: true,
        subcategory: true,
      },
    });

    // Serialize for response
    const serializedProduct = convertBigIntFields({
      ...updatedProduct,
      date: updatedProduct.date?.toString() || null,
      createdAt: updatedProduct.createdAt?.toISOString() || null,
      updatedAt: updatedProduct.updatedAt?.toISOString() || null,
    });

    res.status(200).json({ success: true, message: 'Product Updated', product: serializedProduct });
  } catch (error) {
    console.error('updateProduct error:', { name: error?.name, message: error?.message, stack: error?.stack });
    res.status(500).json({ success: false, message: 'Failed to update product', error: error?.message });
  }
};
const adminListProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, // Larger default for admin
      search, 
      categoryId, 
      subcategoryId, 
      grouping,
      isActive, // Admin filter
      stockMin, // Admin filter for low stock
      stockMax
    } = req.query;

    const result = await getProducts({ 
      page: +page, 
      limit: +limit, 
      search: search ? search.toString() : '', 
      categoryId: categoryId ? +categoryId : undefined, 
      subcategoryId: subcategoryId ? +subcategoryId : undefined, 
      grouping: grouping ? grouping.toString() : undefined,
      isActive: isActive ? isActive === 'true' : undefined,
      stockMin: stockMin ? +stockMin : undefined,
      stockMax: stockMax ? +stockMax : undefined
    });

    const safeProducts = result.products.map((product) => convertBigIntFields({
      ...product,
      date: product.date?.toString() || null,
      createdAt: product.createdAt?.toISOString() || null,
      updatedAt: product.updatedAt?.toISOString() || null,
    }));

    res.json({ 
      success: true, 
      products: safeProducts,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.error('adminListProducts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// Update the export at the end of controllers/productController.js
export { listProducts, addProduct, removeProduct, singleProduct, searchProducts, updateProduct,adminListProducts };