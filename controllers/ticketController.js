import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Avoid self-signed cert errors
  },
});

// Verify transporter configuration at startup
(async () => {
  try {
    console.log('Verifying Nodemailer config:', {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD ? '[REDACTED]' : undefined,
    });
    await transporter.verify();
    console.log('Email transporter is ready to send messages');
  } catch (error) {
    console.error('Email transporter configuration error:', {
      message: error.message,
      stack: error.stack,
    });
  }
})();

export const generateTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, email, subject, message, orderId, selectedProducts, orderItemIds } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    const isRefundReplacement = subject.toLowerCase().includes('refund') || subject.toLowerCase().includes('replacement');
    let finalOrderItemIds = [];
    let finalSelectedProducts = null;

    if (isRefundReplacement && selectedProducts && orderItemIds) {
      finalOrderItemIds = Array.isArray(orderItemIds) ? orderItemIds.map(Number) : selectedProducts.map((p) => Number(p.orderItemId));
      finalSelectedProducts = JSON.stringify(selectedProducts);

      const existingTicket = await prisma.ticket.findFirst({
        where: {
          userId,
          orderId: orderId ? parseInt(orderId) : undefined,
          status: 'OPEN',
          orderItemIds: {
            hasSome: finalOrderItemIds,
          },
        },
      });

      if (existingTicket) {
        return res.status(400).json({
          success: false,
          message: 'You already have an open ticket for one or more selected products. Please wait for resolution.',
        });
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        ticketId: `TICK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        userId,
        orderId: orderId ? parseInt(orderId) : undefined,
        orderItemIds: finalOrderItemIds.length > 0 ? finalOrderItemIds : undefined,
        subject,
        message,
        products: finalSelectedProducts,
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (ticket.user.email) {
      try {
        const mailOptions = {
          from: `"Dolchico Support" <${process.env.EMAIL_USER}>`,
          to: ticket.user.email,
          subject: `Ticket Created: ${ticket.subject} (#${ticket.ticketId})`,
          text: `Dear ${ticket.user.name || 'Customer'},\n\nYour support ticket (#${ticket.ticketId}) has been created.\nSubject: ${ticket.subject}\nMessage: ${ticket.message}\n\nWe will respond soon.\n\nBest regards,\nDolchico Support`,
          html: `<p>Dear ${ticket.user.name || 'Customer'},</p><p>Your support ticket (#${ticket.ticketId}) has been created.</p><p><strong>Subject:</strong> ${ticket.subject}</p><p><strong>Message:</strong> ${ticket.message}</p><p>We will respond soon.</p><p>Best regards,<br>Dolchico Support</p>`,
        };
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully for ticket creation:', { ticketId: ticket.ticketId, to: ticket.user.email });
      } catch (emailError) {
        console.error('Failed to send ticket creation email:', {
          message: emailError.message,
          stack: emailError.stack,
          ticketId: ticket.ticketId,
          to: ticket.user.email,
        });
      }
    } else {
      console.warn('No email address found for user on ticket creation:', { ticketId: ticket.ticketId, user: ticket.user });
    }

    res.json({
      success: true,
      ticketId: ticket.ticketId,
      id: ticket.id,
      message: 'Ticket created successfully',
    });
  } catch (error) {
    console.error('Error generating ticket:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    res.status(500).json({ success: false, message: 'Failed to generate ticket' });
  }
};

export const getTickets = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {
      ...(status && status !== 'all' ? { status } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: 'insensitive' } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { ticketId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    console.log('Fetching tickets with query:', { status, search, where });

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phoneNumber: true } },
      },
    });

    res.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error('Error fetching tickets:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

// Utility function to convert BigInt to string in an object
function serializeBigInt(obj) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export const getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching ticket with ID: ${id}`);

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: true,
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const serializedTicket = serializeBigInt(ticket);
    return res.status(200).json({ success: true, ticket: serializedTicket });
  } catch (error) {
    console.error('Error fetching ticket:', {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
    });
    return res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!['OPEN', 'RESOLVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (!note || note.length < 10) {
      return res.status(400).json({ success: false, message: 'Note is required and must be at least 10 characters' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        status,
        message: `${ticket.message || ''}\n\n--- Status Update (${new Date().toISOString()}): ${note}`,
        updatedAt: new Date(),
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phoneNumber: true } },
        order: {
          include: {
            items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          },
        },
      },
    });

    if (ticket.user.email) {
      try {
        const mailOptions = {
          from: `"Dolchico Support" <${process.env.EMAIL_USER}>`,
          to: ticket.user.email,
          subject: `Ticket Updated: ${ticket.subject} (#${ticket.ticketId})`,
          text: `Dear ${ticket.user.name || 'Customer'},\n\nYour support ticket (#${ticket.ticketId}) has been updated.\nStatus: ${status}\nNote: ${note}\n\nBest regards,\nDolchico Support`,
          html: `<p>Dear ${ticket.user.name || 'Customer'},</p><p>Your support ticket (#${ticket.ticketId}) has been updated.</p><p><strong>Status:</strong> ${status}</p><p><strong>Note:</strong> ${note}</p><p>Best regards,<br>Dolchico Support</p>`,
        };
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully for ticket update:', { ticketId: ticket.ticketId, to: ticket.user.email });
      } catch (emailError) {
        console.error('Failed to send ticket update email:', {
          message: emailError.message,
          stack: emailError.stack,
          ticketId: ticket.ticketId,
          to: ticket.user.email,
        });
      }
    } else {
      console.warn('No email address found for user on ticket update:', { ticketId: ticket.ticketId, user: ticket.user });
    }

    const serializedTicket = serializeBigInt(updatedTicket);
    res.json({ success: true, ticket: serializedTicket });
  } catch (error) {
    console.error('Error updating ticket status:', {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      message: `Failed to update ticket status: ${error.message}`,
    });
  }
};

export const replyToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length < 1) {
      return res.status(400).json({ success: false, message: 'Reply message is required' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        message: `${ticket.message || ''}\n\n--- Admin Reply (${new Date().toISOString()}): ${message}`,
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phoneNumber: true } },
        order: {
          include: {
            items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          },
        },
      },
    });

    if (ticket.user.email) {
      try {
        const mailOptions = {
          from: `"Dolchico Support" <${process.env.EMAIL_USER}>`,
          to: ticket.user.email,
          subject: `New Reply on Ticket: ${ticket.subject} (#${ticket.ticketId})`,
          text: `Dear ${ticket.user.name || 'Customer'},\n\nYou have received a new reply on your support ticket (#${ticket.ticketId}).\nReply: ${message}\n\nBest regards,\nDolchico Support`,
          html: `<p>Dear ${ticket.user.name || 'Customer'},</p><p>You have received a new reply on your support ticket (#${ticket.ticketId}).</p><p><strong>Reply:</strong> ${message}</p><p>Best regards,<br>Dolchico Support</p>`,
        };
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully for ticket reply:', { ticketId: ticket.ticketId, to: ticket.user.email });
      } catch (emailError) {
        console.error('Failed to send ticket reply email:', {
          message: emailError.message,
          stack: emailError.stack,
          ticketId: ticket.ticketId,
          to: ticket.user.email,
        });
      }
    } else {
      console.warn('No email address found for user on ticket reply:', { ticketId: ticket.ticketId, user: ticket.user });
    }

    const serializedTicket = serializeBigInt(updatedTicket);
    res.json({ success: true, ticket: serializedTicket });
  } catch (error) {
    console.error('Reply to ticket error:', {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
      body: req.body,
    });
    res.status(500).json({ success: false, message: `Failed to send reply: ${error.message}` });
  }
};