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
// Updated addOffer in category.controller.js to always expect JSON (no FormData for offerRules)
export const addOffer = handleRequest(async (req, res) => {
  let payload = { ...req.body };
  const categoryIdNum = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(categoryIdNum)) return res.status(400).json({ message: 'Invalid category id' });

  console.log('📥 Controller received body:', JSON.stringify(payload, null, 2));  // See full input

  // Handle base64 iconUrl upload (from JSON)
  if (payload.iconUrl && typeof payload.iconUrl === 'string' && payload.iconUrl.startsWith('data:image')) {
    try {
      console.log('Uploading base64 offer icon to Cloudinary...');
      const base64Data = payload.iconUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const secureUrl = await uploadBuffer(buffer, { folder: 'offers' });
      payload.iconUrl = secureUrl;
      console.log('Base64 icon upload success, iconUrl:', secureUrl);
    } catch (e) {
      console.error('Failed to upload base64 icon:', e);
      payload.iconUrl = null;
    }
  } else {
    console.log('No offer icon provided - skipping upload');
  }

  // Parse discountPercent
  if (payload.discountPercent !== undefined) {
    const f = parseFloat(payload.discountPercent);
    if (Number.isNaN(f)) return res.status(400).json({ message: 'Invalid discountPercent' });
    payload.discountPercent = f;
  }

  // Handle offerRules (direct from JSON)
  if (payload.offerRules) {
    if (typeof payload.offerRules === 'string') {
      try {
        payload.offerRules = JSON.parse(payload.offerRules);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid offerRules JSON' });
      }
    }
    if (!Array.isArray(payload.offerRules)) {
      return res.status(400).json({ message: 'offerRules must be an array after parsing' });
    }
    console.log(`📊 Controller processing ${payload.offerRules.length} rules`);
    payload.offerRules.forEach((rule, idx) => {
      console.log(`Controller rule ${idx}: subcategoryId=${rule.subcategoryId}`);
    });
    // Process rules: Ensure subcategoryId is number or null
    payload.offerRules = payload.offerRules.map(rule => {
      let subId = rule.subcategoryId;
      if (subId !== undefined && subId !== null && subId !== '') {
        const parsedId = parseInt(subId.toString(), 10);
        if (isNaN(parsedId) || parsedId <= 0) {
          console.warn(`Invalid subcategoryId '${subId}' in rule, setting to null`);
          subId = null;
        } else {
          subId = parsedId;
        }
      } else {
        subId = null;
      }
      rule.subcategoryId = subId;

      // Parse numbers
      rule.priceBelow = rule.priceBelow !== undefined ? parseFloat(rule.priceBelow) || null : undefined;
      rule.priceAbove = rule.priceAbove !== undefined ? parseFloat(rule.priceAbove) || null : undefined;
      rule.minDiscount = rule.minDiscount !== undefined ? parseInt(rule.minDiscount, 10) || 0 : 0;
      rule.maxDiscount = rule.maxDiscount !== undefined ? parseInt(rule.maxDiscount, 10) || 100 : 100;
      rule.ageGroupStart = rule.ageGroupStart !== undefined ? parseInt(rule.ageGroupStart, 10) || null : null;
      rule.ageGroupEnd = rule.ageGroupEnd !== undefined ? parseInt(rule.ageGroupEnd, 10) || null : null;

      // Tags array
      rule.tags = Array.isArray(rule.tags) ? rule.tags : [];

      console.log(`Processed rule: subcategoryId=${rule.subcategoryId}, minDiscount=${rule.minDiscount}`);
      return rule;
    });

    if (payload.offerRules.length === 0) {
      return res.status(400).json({ message: 'Offer must have at least one valid rule' });
    }
  } else {
    console.warn('No offerRules in payload - falling back to single rule from top-level fields');
    // Fallback: Create single rule from flat fields if no offerRules
    const flatRule = {
      priceBelow: payload.priceBelow !== undefined ? parseFloat(payload.priceBelow) || null : null,
      priceAbove: payload.priceAbove !== undefined ? parseFloat(payload.priceAbove) || null : null,
      minDiscount: payload.minDiscount !== undefined ? parseInt(payload.minDiscount, 10) || null : null,
      maxDiscount: payload.maxDiscount !== undefined ? parseInt(payload.maxDiscount, 10) || null : null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      subcategoryId: payload.subcategoryId !== undefined ? parseInt(payload.subcategoryId, 10) || null : null
    };
    payload.offerRules = [flatRule];
    console.log('Fallback single rule:', JSON.stringify(flatRule, null, 2));
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