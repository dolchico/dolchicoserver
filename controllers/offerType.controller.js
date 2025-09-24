import * as OfferTypeService from '../services/offerType.service.js';
import { uploadFile, uploadBuffer } from '../services/cloudinary.service.js';

const handleRequest = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
};

export const createOfferType = handleRequest(async (req, res) => {
  const payload = { ...req.body };
  if (req.file) {
    const secureUrl = req.file.buffer ? await uploadBuffer(req.file.buffer, { folder: 'offer_types' }) : await uploadFile(req.file.path, { folder: 'offer_types' });
    payload.iconUrl = secureUrl;
  }
  const ot = await OfferTypeService.createOfferType(payload);
  res.status(201).json(ot);
});

export const updateOfferType = handleRequest(async (req, res) => {
  const payload = { ...req.body };
  if (req.file) {
    const secureUrl = req.file.buffer ? await uploadBuffer(req.file.buffer, { folder: 'offer_types' }) : await uploadFile(req.file.path, { folder: 'offer_types' });
    payload.iconUrl = secureUrl;
  }
  const ot = await OfferTypeService.updateOfferType(req.params.id, payload);
  res.status(200).json(ot);
});

export const deleteOfferType = handleRequest(async (req, res) => {
  await OfferTypeService.deleteOfferType(req.params.id);
  res.status(204).send();
});

export const listOfferTypes = handleRequest(async (req, res) => {
  const list = await OfferTypeService.listOfferTypes();
  res.status(200).json(list);
});

export const getOfferType = handleRequest(async (req, res) => {
  const ot = await OfferTypeService.getOfferType(req.params.id);
  if (!ot) return res.status(404).json({ message: 'OfferType not found' });
  res.status(200).json(ot);
});
