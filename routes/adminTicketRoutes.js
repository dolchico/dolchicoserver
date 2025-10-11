// routes/adminTicketRoutes.js - Fixed route paths (no leading '/')
import express from 'express';
import { 
  listTickets, 
  getTicket, 
  updateTicketStatus, 
  listFeedback, 
  listEscalations 
} from '../controllers/adminTicketController.js';
import { ensureAuthWithStatus, ensureRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Support Tickets Routes
router.get('tickets', ensureAuthWithStatus, ensureRole(['ADMIN']), listTickets); // Removed leading '/'
router.get('tickets/:id', ensureAuthWithStatus, ensureRole(['ADMIN']), getTicket); // Removed leading '/'
router.put('tickets/:id/status', ensureAuthWithStatus, ensureRole(['ADMIN']), updateTicketStatus); // Removed leading '/'

// Customer Feedback Routes (integrates with reviews)
router.get('feedback', ensureAuthWithStatus, ensureRole(['ADMIN']), listFeedback); // Removed leading '/'

// Escalations Routes (high-priority tickets/feedback)
router.get('escalations', ensureAuthWithStatus, ensureRole(['ADMIN']), listEscalations); // Removed leading '/'

export default router;