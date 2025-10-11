// routes/ticketRoutes.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
  generateTicket,
  getTickets,
  getTicket,
  updateTicketStatus,
  replyToTicket,
} from '../controllers/ticketController.js';
import { ensureAuth, ensureAuthWithStatus, ensureRole } from '../middleware/authMiddleware.js';

const prisma = new PrismaClient();
const ticketRouter = express.Router();

// Log incoming requests for debugging
ticketRouter.use((req, res, next) => {
  console.log(`Ticket Route: ${req.method} ${req.originalUrl}`);
  next();
});

// User routes
ticketRouter.post('/generateticket', ensureAuth, generateTicket);

// Admin routes
ticketRouter.get('/admin/tickets', ensureAuthWithStatus, ensureRole(['ADMIN']), getTickets);
ticketRouter.get('/admin/tickets/:id', ensureAuthWithStatus, ensureRole(['ADMIN']), getTicket);
ticketRouter.put('/admin/tickets/:id/status', ensureAuthWithStatus, ensureRole(['ADMIN']), updateTicketStatus);
ticketRouter.post('/admin/tickets/:id/reply', ensureAuthWithStatus, ensureRole(['ADMIN']), replyToTicket);

// Escalations route
ticketRouter.get('/admin/support/escalations', ensureAuthWithStatus, ensureRole(['ADMIN']), async (req, res) => {
  try {
    const { priority } = req.query;

    // Fetch tickets open for more than 3 days
    const tickets = await prisma.ticket.findMany({
      where: {
        status: 'OPEN',
        createdAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, // Tickets > 3 days
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch low-rated reviews (rating <= 2)
    const reviews = await prisma.review.findMany({
      where: {
        rating: { lte: 2 },
        isDeleted: false,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format tickets as escalations
    const ticketEscalations = tickets.map((ticket) => {
      const daysOpen = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const derivedPriority = daysOpen > 5 ? 'HIGH' : daysOpen >= 3 ? 'MEDIUM' : 'LOW';
      return {
        id: ticket.id,
        type: 'TICKET',
        user: { name: ticket.user.name || 'Unknown', email: ticket.user.email || 'Unknown' },
        subject: ticket.subject,
        priority: derivedPriority,
        createdAt: ticket.createdAt.toISOString(),
        daysOpen,
        orderId: ticket.orderId,
      };
    });

    // Format reviews as escalations
    const reviewEscalations = reviews.map((review) => {
      const daysOpen = Math.floor((Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const derivedPriority = review.rating === 1 ? 'HIGH' : 'MEDIUM'; // Rating 1 = HIGH, 2 = MEDIUM
      return {
        id: review.id,
        type: 'FEEDBACK',
        user: { name: review.user.name || 'Unknown', email: review.user.email || 'Unknown' },
        subject: review.title || 'Feedback',
        priority: derivedPriority,
        createdAt: review.createdAt.toISOString(),
        daysOpen,
        orderId: review.orderId,
        rating: review.rating,
      };
    });

    // Combine and filter escalations
    let escalations = [...ticketEscalations, ...reviewEscalations];
    if (priority && priority !== 'all') {
      escalations = escalations.filter((esc) => esc.priority === priority);
    }

    res.json({ success: true, escalations });
  } catch (error) {
    console.error('Error fetching escalations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch escalations' });
  }
});

export default ticketRouter;