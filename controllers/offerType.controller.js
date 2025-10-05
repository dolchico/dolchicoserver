import * as OfferTypeService from '../services/offerType.service.js';
import { uploadFile, uploadBuffer } from '../services/cloudinary.service.js';
import { validationResult } from 'express-validator'; // Assuming you're using express-validator for input validation

const handleRequest = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('Add Offer Error:', error);
    
    // Specific handling for duplicate title
    if (error.message && error.message.includes('title already exists')) {
      return res.status(409).json({ message: error.message }); // Conflict status
    }
    
    // Other Prisma/DB errors
    if (error.code === 'P2002') { // Unique constraint violation
      return res.status(409).json({ message: 'Duplicate data detected' });
    } else if (error.code === 'P2025') { // Record not found
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
};

export const addOfferToCategory = handleRequest(async (req, res) => {
  const categoryId = req.params.id; // String from params
  const payload = { ...req.body };

  // Handle image upload if present (assuming multer)
  if (req.file) {
    try {
      const secureUrl = req.file.buffer 
        ? await uploadBuffer(req.file.buffer, { folder: 'offers' }) 
        : await uploadFile(req.file.path, { folder: 'offers' });
      payload.iconUrl = secureUrl; // Map to iconUrl (per schema)
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload icon' });
    }
  }

  // Ignore invalid fields (like 'icon' if schema uses 'iconUrl')
  const { icon, ...validPayload } = payload; // Strip 'icon' if present
  console.log('Ignoring invalid Offer fields:', Object.keys(payload).filter(k => k !== 'icon' && !['title', 'description', 'discountPercent', 'iconUrl', 'isActive', 'startDate', 'endDate', 'offerRules'].includes(k)));

  const offer = await CategoryService.addOffer(categoryId, validPayload);
  res.status(201).json(offer);
});

export const createOfferType = handleRequest(async (req, res) => {
  const payload = { ...req.body };
  
  // Sanitize and validate payload if needed
  if (payload.isActive === undefined) {
    payload.isActive = true; // Default active
  }

  if (req.file) {
    try {
      const secureUrl = req.file.buffer 
        ? await uploadBuffer(req.file.buffer, { folder: 'offer_types' }) 
        : await uploadFile(req.file.path, { folder: 'offer_types' });
      payload.iconUrl = secureUrl;
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload icon' });
    }
  }

  const ot = await OfferTypeService.createOfferType(payload);
  res.status(201).json(ot);
});

export const updateOfferType = handleRequest(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID provided' });
  }

  const payload = { ...req.body };

  if (req.file) {
    try {
      const secureUrl = req.file.buffer 
        ? await uploadBuffer(req.file.buffer, { folder: 'offer_types' }) 
        : await uploadFile(req.file.path, { folder: 'offer_types' });
      payload.iconUrl = secureUrl;
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload icon' });
    }
  }

  const ot = await OfferTypeService.updateOfferType(id, payload);
  res.status(200).json(ot);
});

export const deleteOfferType = handleRequest(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID provided' });
  }

  await OfferTypeService.deleteOfferType(id);
  res.status(204).send();
});

export const listOfferTypes = handleRequest(async (req, res) => {
  // Support query params for filtering/pagination
  const { page = 1, limit = 10, search } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const where = { isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [list, total] = await Promise.all([
    OfferTypeService.listOfferTypes({ where, skip, take: parseInt(limit, 10) }),
    OfferTypeService.countOfferTypes({ where })
  ]);

  res.status(200).json({
    data: list,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / parseInt(limit, 10))
    }
  });
});

export const getOfferType = handleRequest(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID provided' });
  }

  const ot = await OfferTypeService.getOfferType(id);
  if (!ot) {
    return res.status(404).json({ message: 'OfferType not found' });
  }
  res.status(200).json(ot);
});