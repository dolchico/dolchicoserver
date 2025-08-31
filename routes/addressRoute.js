import express from 'express';
import {
  getAllAddresses,
  addAddress,
  editAddress,
  removeAddress,
  setDefaultAddress,
} from '../controllers/addressController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes in this file
// This ensures only authenticated users can manage their addresses.
router.use(authMiddleware);

// --- Address Routes ---

// GET /api/addresses - Fetches all addresses for the user
router.get('/', getAllAddresses);

// POST /api/addresses - Adds a new address for the user
router.post('/', addAddress);

// PATCH /api/addresses/:id - Updates a specific address
router.patch('/:id', editAddress);

// DELETE /api/addresses/:id - Deletes a specific address
router.delete('/:id', removeAddress);

// PATCH /api/addresses/:id/set-default - Sets a specific address as the default
router.patch('/:id/set-default', setDefaultAddress);

export default router;