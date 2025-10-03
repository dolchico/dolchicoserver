import * as CategoryService from '../services/category.service.js';
import * as OfferTypeService from '../services/offerType.service.js';
import { uploadFile, uploadBuffer } from '../services/cloudinary.service.js';
import path from 'path';

const handleRequest = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error(error);
    // Prisma unique constraint error
    if (error && error.code === 'P2002') {
      const fields = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : error.meta?.target || 'field';
      return res.status(409).json({ message: `Unique constraint failed on the fields: (${fields})` });
    }

    // Foreign key constraint error: cannot delete due to existing relations
    if (error.code === 'P2003') {
      const constraint = error.meta?.constraint || 'related records';
      return res.status(409).json({ message: `Cannot delete or modify: foreign key constraint violated on ${constraint}` });
    }
    // Fallback
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
};

// Assuming this is in your categories controller file (e.g., CategoryController.js or categoriesApi.ts)
export const createCategory = handleRequest(async (req, res) => {
  try {
    // Log for debugging (remove in production)
    console.log('Raw req.body:', req.body);

    // Start with payload from req.body
    const payload = { ...req.body };

    // CRITICAL: Strip 'id' to let database auto-generate it
    delete payload.id;

    // Handle image upload (your existing logic)
    if (req.file) {
      const secureUrl = req.file.buffer
        ? await uploadBuffer(req.file.buffer, { folder: 'categories' })
        : await uploadFile(req.file.path, { folder: 'categories' });
      payload.imageUrl = secureUrl;
    }

    // Log final payload for debugging (remove in production)
    console.log('Final payload (id stripped):', payload);

    // Pass to service (Prisma will auto-generate id)
    const category = await CategoryService.createCategory(payload);
    res.status(201).json(category);
  } catch (error) {
    // Handle Prisma unique constraint errors specifically
    if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
      console.error('ID conflict error:', error);
      return res.status(409).json({ 
        message: 'A category with this ID already exists. Please omit ID from the request to auto-generate it.' 
      });
    }
    // Re-throw other errors
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export const updateCategory = handleRequest(async (req, res) => {
  const category = await CategoryService.updateCategory(req.params.id, req.body);
  res.status(200).json(category);
});

export const deleteCategory = handleRequest(async (req, res) => {
  await CategoryService.deleteCategory(req.params.id);
  res.status(204).send();
});

export const getAllCategories = handleRequest(async (req, res) => {
  const categories = await CategoryService.getAllCategories();
  res.status(200).json(categories);
});

export const getCategoryByName = handleRequest(async (req, res) => {
  const category = await CategoryService.getCategoryByName(req.params.name);
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }
  res.status(200).json(category);
});

// --- Subcategory Controllers ---
export const addSubcategory = handleRequest(async (req, res) => {
  const payload = { ...req.body };
  // validate category id param
  const categoryIdNum = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(categoryIdNum)) return res.status(400).json({ message: 'Invalid category id' });

  if (req.file) {
    const secureUrl = req.file.buffer ? await uploadBuffer(req.file.buffer, { folder: 'subcategories' }) : await uploadFile(req.file.path, { folder: 'subcategories' });
    payload.imageUrl = secureUrl;
  }

  const subcategory = await CategoryService.addSubcategory(categoryIdNum, payload);
  res.status(201).json(subcategory);
});

export const updateSubcategory = handleRequest(async (req, res) => {
    const subcategory = await CategoryService.updateSubcategory(req.params.id, req.body);
    res.status(200).json(subcategory);
});

export const deleteSubcategory = handleRequest(async (req, res) => {
    await CategoryService.deleteSubcategory(req.params.id);
    res.status(204).send();
});

export const getSubcategoriesByCategoryName = handleRequest(async (req, res) => {
  const subcategories = await CategoryService.getSubcategoriesByCategoryName(req.params.name);
  res.status(200).json(subcategories);
});

export const getSubcategoriesByGrouping = handleRequest(async (req, res) => {
    const subcategories = await CategoryService.getSubcategoriesByGrouping(req.params.grouping);
    res.status(200).json(subcategories);
});

// --- Offer Controllers ---
export const addOffer = handleRequest(async (req, res) => {
  const payload = { ...req.body };
  // validate category id param
  const categoryIdNum = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(categoryIdNum)) return res.status(400).json({ message: 'Invalid category id' });

  if (req.file) {
    const secureUrl = req.file.buffer ? await uploadBuffer(req.file.buffer, { folder: 'offers' }) : await uploadFile(req.file.path, { folder: 'offers' });
    payload.iconUrl = secureUrl;
  }
  // coerce numeric fields (FormData sends strings)
  if (payload.discountPercent !== undefined) {
    const f = parseFloat(payload.discountPercent);
    if (Number.isNaN(f)) return res.status(400).json({ message: 'Invalid discountPercent' });
    payload.discountPercent = f;
  }
  if (payload.offerTypeId !== undefined) {
    const oi = Number.parseInt(payload.offerTypeId, 10);
    if (Number.isNaN(oi)) delete payload.offerTypeId; else payload.offerTypeId = oi;
  }

  // If offerRules come as JSON string (common in form-data), parse it
  if (payload.offerRules && typeof payload.offerRules === 'string') {
    try { payload.offerRules = JSON.parse(payload.offerRules); } catch (e) {
      return res.status(400).json({ message: 'Invalid offerRules JSON' });
    }
  }

  // offerRules can be provided as an array in payload.offerRules
  // validate offerTypeId refers to an existing offer type
  if (payload.offerTypeId !== undefined) {
    const ot = await OfferTypeService.getOfferType(payload.offerTypeId);
    if (!ot) return res.status(400).json({ message: `offerTypeId ${payload.offerTypeId} not found` });
  }

  const offer = await CategoryService.addOffer(categoryIdNum, payload);
  res.status(201).json(offer);
});

export const updateOffer = handleRequest(async (req, res) => {
  // coerce numeric fields and parse offerRules from form-data if needed
  const payload = { ...req.body };
      if (payload.discountPercent !== undefined) {
        const f = parseFloat(payload.discountPercent);
        if (Number.isNaN(f)) return res.status(400).json({ message: 'Invalid discountPercent' });
        payload.discountPercent = f;
      }
      if (payload.offerTypeId !== undefined) {
        const oi = Number.parseInt(payload.offerTypeId, 10);
        if (Number.isNaN(oi)) delete payload.offerTypeId; else payload.offerTypeId = oi;
      }
      if (payload.offerRules && typeof payload.offerRules === 'string') {
        try { payload.offerRules = JSON.parse(payload.offerRules); } catch (e) {
          return res.status(400).json({ message: 'Invalid offerRules JSON' });
        }
      }

      // validate offerTypeId exists
      if (payload.offerTypeId !== undefined) {
        const ot = await OfferTypeService.getOfferType(payload.offerTypeId);
        if (!ot) return res.status(400).json({ message: `offerTypeId ${payload.offerTypeId} not found` });
      }

      const offer = await CategoryService.updateOffer(req.params.id, payload);
    res.status(200).json(offer);
});

export const deleteOffer = handleRequest(async (req, res) => {
    await CategoryService.deleteOffer(req.params.id);
    res.status(204).send();
});

export const getOffersByCategoryName = handleRequest(async (req, res) => {
  const offers = await CategoryService.getOffersByCategoryName(req.params.name);
  res.status(200).json(offers);
});

// --- Bulk Initialization Controller ---
export const initializeData = handleRequest(async (req, res) => {
  const result = await CategoryService.initializeData(req.body);
  res.status(201).json({ message: 'Data initialized successfully', data: result });
});