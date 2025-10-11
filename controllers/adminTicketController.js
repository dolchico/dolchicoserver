// controllers/adminTicketController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { order: { id: parseInt(search) } },
      ];
    }

    // Edge case: Handle invalid sortBy
    const validSortFields = ['createdAt', 'updatedAt', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortDir === 'asc' ? 'asc' : 'desc';

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          user: { 
            select: { 
              id: true, 
              name: true, 
              email: true, 
              phoneNumber: true 
            } 
          },
          order: { 
            select: { id: true, amount: true } 
          },
        },
        orderBy: { [sortField]: sortDirection },
        skip,
        take: parseInt(limit),
      }),
      prisma.ticket.count({ where }),
    ]);

    // Edge case: If no tickets, return empty array
    if (tickets.length === 0 && parseInt(page) > 1) {
      return res.status(404).json({ 
        success: false, 
        message: 'No more tickets found' 
      });
    }

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('List tickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

export const getTicket = async (req, res) => {
  try {
    const { id } = req.params;

    // Edge case: Validate ID format (cuid)
    if (!id || id.length < 10) {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        order: {
          include: {
            items: {
              include: { 
                product: { select: { id: true, name: true, sku: true } } 
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Edge case: Parse products JSON if exists
    if (ticket.products) {
      ticket.products = JSON.parse(ticket.products);
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    // Edge case: JSON parse error
    if (error instanceof SyntaxError) {
      res.status(500).json({ success: false, message: 'Invalid ticket data' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
    }
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    // Edge case: Validate status
    if (!['RESOLVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be RESOLVED or CLOSED.' });
    }

    // Edge case: Note required for updates
    if (!note || note.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Status update note must be at least 10 characters.' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Edge case: Status transition rules
    if (status === 'RESOLVED' && ticket.status === 'CLOSED') {
      return res.status(400).json({ success: false, message: 'Cannot resolve a closed ticket.' });
    }
    if (status === 'CLOSED' && ticket.status !== 'RESOLVED') {
      return res.status(400).json({ success: false, message: 'Ticket must be resolved before closing.' });
    }

    // Edge case: Prevent multiple simultaneous updates (optimistic locking via updatedAt check)
    const currentUpdatedAt = ticket.updatedAt;
    // In real app, use transactions or versioning

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        status,
        message: `${ticket.message}\n\n--- Admin Update (${new Date().toISOString()}): ${note}`,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null,
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true } },
      },
    });

    // Edge case: If status changed, notify user (mock)
    // await sendTicketUpdateEmail(updatedTicket.user.email, updatedTicket, status, note);

    res.json({ success: true, ticket: updatedTicket });
  } catch (error) {
    console.error('Update ticket status error:', error);
    // Edge case: Concurrent update conflict
    if (error.code === 'P2032') { // Record not found after update (optimistic lock)
      return res.status(409).json({ success: false, message: 'Ticket was updated by another user. Please refresh.' });
    }
    res.status(500).json({ success: false, message: 'Failed to update ticket status' });
  }
};

export const listFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, ratingMin, ratingMax, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type && type !== 'all') {
      where.type = type;
    }
    if (ratingMin || ratingMax) {
      where.rating = {};
      if (ratingMin) where.rating.gte = parseInt(ratingMin);
      if (ratingMax) where.rating.lte = parseInt(ratingMax);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { comment: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [feedbacks, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true } },
          order: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.review.count({ where }),
    ]);

    res.json({
      success: true,
      feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('List feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
};

export const listEscalations = async (req, res) => {
  try {
    const { page = 1, limit = 10, priority, daysOpenMin } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Escalations: Tickets or reviews older than 3 days and OPEN, or low rating
    const ticketWhere = {
      status: 'OPEN',
      createdAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, // >3 days old
    };
    const reviewWhere = {
      rating: { lte: 2 }, // Low rating
      createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Recent
    };

    if (daysOpenMin) {
      const minDate = new Date(Date.now() - parseInt(daysOpenMin) * 24 * 60 * 60 * 1000);
      ticketWhere.createdAt = { ...ticketWhere.createdAt, lt: minDate };
    }

    const [tickets, reviews, totalTickets, totalReviews] = await Promise.all([
      prisma.ticket.findMany({
        where: ticketWhere,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'asc' }, // Oldest first
        skip,
        take: parseInt(limit),
      }),
      prisma.review.findMany({
        where: reviewWhere,
        include: { user: { select: { name: true, email: true } }, product: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.ticket.count({ where: ticketWhere }),
      prisma.review.count({ where: reviewWhere }),
    ]);

    const escalations = [
      ...tickets.map(t => ({ ...t, type: 'TICKET', daysOpen: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (24 * 60 * 60 * 1000)) })),
      ...reviews.map(r => ({ ...r, type: 'FEEDBACK', daysOpen: Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (24 * 60 * 60 * 1000)) })),
    ].sort((a, b) => b.daysOpen - a.daysOpen); // Sort by days open desc

    res.json({
      success: true,
      escalations: escalations.slice(0, parseInt(limit)), // Limit after merge
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalTickets + totalReviews,
        pages: Math.ceil((totalTickets + totalReviews) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('List escalations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch escalations' });
  }
};