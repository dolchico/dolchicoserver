import * as CategoryService from '../services/category.service.js';
import * as OfferTypeService from '../services/offerType.service.js';
import { uploadBuffer } from '../services/cloudinary.service.js'; // Only uploadBuffer for memory storage
import { Prisma } from '@prisma/client';
import upload from '../middleware/multer.js'; // Imported memoryStorage multer - DO NOT REDEFINE LOCALLY!

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
  console.log('Raw req.body:', req.body);
  console.log('req.file present?', !!req.file); // Debug: Should log true if file uploaded
  if (req.file) {
    console.log('File details:', { originalname: req.file.originalname, size: req.file.size, buffer: !!req.file.buffer });
  }

  const payload = { ...req.body };
  delete payload.id;
  delete payload.image; // Strip invalid 'image' field (from FormData)

  if (req.file && req.file.buffer) {
    console.log('Uploading to Cloudinary...');
    const secureUrl = await uploadBuffer(req.file.buffer, { folder: 'categories' });
    payload.imageUrl = secureUrl;
    console.log('Upload success, imageUrl:', secureUrl);
  } else {
    console.warn('No valid file buffer found - check multer config (should be memoryStorage)');
  }

  console.log('Final payload:', payload);
  const category = await CategoryService.createCategory(payload);
  res.status(201).json(category);
});

export const updateCategory = handleRequest(async (req, res) => {
  console.log('Update req.file present?', !!req.file);
  const payload = { ...req.body };
  delete payload.image; // Strip invalid field

  if (req.file && req.file.buffer) {
    const secureUrl = await uploadBuffer(req.file.buffer, { folder: 'categories' });
    payload.imageUrl = secureUrl;
  }

  const category = await CategoryService.updateCategory(req.params.id, payload);
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

  if (req.file && req.file.buffer) {
    console.log('Uploading subcategory to Cloudinary...');
    const secureUrl = await uploadBuffer(req.file.buffer, { folder: 'subcategories' });
    payload.imageUrl = secureUrl;
    console.log('Subcategory upload success, imageUrl:', secureUrl);
  } else {
    console.warn('No valid subcategory file buffer found');
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
  console.log('Update subcategory req.file present?', !!req.file);
  const payload = { ...req.body };
  delete payload.image; // Prevent unknown 'image' field

  if (req.file && req.file.buffer) {
    const secureUrl = await uploadBuffer(req.file.buffer, { folder: 'subcategories' });
    payload.imageUrl = secureUrl;
  }

  const subcategory = await CategoryService.updateSubcategory(req.params.id, payload);
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

  if (req.file && req.file.buffer) {
    console.log('Uploading offer to Cloudinary...');
    const secureUrl = await uploadBuffer(req.file.buffer, { folder: 'offers' });
    payload.iconUrl = secureUrl;
    console.log('Offer upload success, iconUrl:', secureUrl);
  } else {
    console.warn('No valid offer file buffer found');
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
  console.log('Update offer req.file present?', !!req.file);
  const payload = { ...req.body };

  if (req.file && req.file.buffer) {
    const secureUrl = await uploadBuffer(req.file.buffer, { folder: 'offers' });
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