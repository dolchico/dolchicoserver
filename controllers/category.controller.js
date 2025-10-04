import * as CategoryService from '../services/category.service.js';
import * as OfferTypeService from '../services/offerType.service.js';
import { uploadFile, uploadBuffer } from '../services/cloudinary.service.js';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import path from 'path';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

const handleRequest = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    console.error(error);
    if (error && error.code === 'P2002') {
      const fields = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : error.meta?.target || 'field';
      return res.status(409).json({ message: `Unique constraint failed on the fields: (${fields})` });
    }
    if (error.code === 'P2003') {
      const constraint = error.meta?.constraint || 'related records';
      return res.status(409).json({ message: `Cannot delete or modify: foreign key constraint violated on ${constraint}` });
    }
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
};

export const createCategory = handleRequest(async (req, res) => {
  try {
    console.log('Raw req.body:', req.body);
    const payload = { ...req.body };
    delete payload.id;

    if (req.file) {
      const secureUrl = req.file.buffer
        ? await uploadBuffer(req.file.buffer, { folder: 'categories' })
        : await uploadFile(req.file.path, { folder: 'categories' });
      payload.imageUrl = secureUrl;
    }

    console.log('Final payload (id stripped):', payload);
    const category = await CategoryService.createCategory(payload);
    res.status(201).json(category);
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
      console.error('ID conflict error:', error);
      return res.status(409).json({ 
        message: 'A category with this ID already exists. Please omit ID from the request to auto-generate it.' 
      });
    }
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
  const { name, grouping, isActive } = req.body;
  const categoryId = String(req.params.id);

  if (!categoryId || isNaN(parseInt(categoryId, 10))) {
    return res.status(400).json({ message: 'Invalid category ID' });
  }

  if (!name || !grouping || !grouping.trim()) {
    return res.status(400).json({ message: 'Name and non-empty grouping are required' });
  }

  const payload = {
    name,
    grouping,
    isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true,
  };

  if (req.file) {
    const secureUrl = req.file.buffer
      ? await uploadBuffer(req.file.buffer, { folder: 'subcategories' })
      : await uploadFile(req.file.path, { folder: 'subcategories' });
    payload.imageUrl = secureUrl;
  }

  try {
    const subcategory = await CategoryService.addSubcategory(categoryId, payload);
    res.status(201).json(subcategory);
  } catch (error) {
    console.error('❌ Add subcategory error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Subcategory with this name already exists for the selected category' });
    }
    throw error;
  }
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
  const categoryIdNum = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(categoryIdNum)) return res.status(400).json({ message: 'Invalid category id' });

  if (req.file) {
    const secureUrl = req.file.buffer ? await uploadBuffer(req.file.buffer, { folder: 'offers' }) : await uploadFile(req.file.path, { folder: 'offers' });
    payload.iconUrl = secureUrl;
  }
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
  if (payload.offerTypeId !== undefined) {
    const ot = await OfferTypeService.getOfferType(payload.offerTypeId);
    if (!ot) return res.status(400).json({ message: `offerTypeId ${payload.offerTypeId} not found` });
  }

  const offer = await CategoryService.addOffer(categoryIdNum, payload);
  res.status(201).json(offer);
});

export const updateOffer = handleRequest(async (req, res) => {
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

export const initializeData = handleRequest(async (req, res) => {
  const result = await CategoryService.initializeData(req.body);
  res.status(201).json({ message: 'Data initialized successfully', data: result });
});