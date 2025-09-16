import prisma from '../lib/prisma.js';
import crypto from 'crypto';

const TICKET_ID_RETRIES = 5;

function utcDatePrefix() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function generateRandomSegment() {
  // Use secure random bytes to create an alphanumeric uppercase 6-char segment
  const bytes = crypto.randomBytes(6);
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out.slice(0, 6);
}

function buildTicketId() {
  return `TKT-${utcDatePrefix()}-${generateRandomSegment()}`;
}

function deriveCategory({ products, subject }) {
  if (Array.isArray(products) && products.length > 0) {
    const actions = products.map(p => p.action);
    const allReplacement = actions.every(a => a === 'Replacement');
    const allRefund = actions.every(a => a === 'Refund');
    if (allReplacement) return 'replacement';
    if (allRefund) return 'refund';
    return 'mixed';
  }

  const subj = (subject || '').toLowerCase();
  if (subj.includes('refund')) return 'refund';
  if (subj.includes('replacement')) return 'replacement';
  return 'general';
}

export async function createTicket(input) {
  const {
    fullName,
    email,
    subject,
    message,
    userId,
    orderId,
    products
  } = input;

  const category = deriveCategory({ products, subject });

  // Quick sanity check: ensure Prisma client has the generated models available
  if (!prisma || typeof prisma.ticket === 'undefined' || typeof prisma.ticket.create !== 'function') {
    const e = new Error('Prisma client is missing the Ticket model API. Run `npx prisma generate` and apply migrations so @prisma/client is up-to-date.');
    e.code = 'PRISMA_MODEL_MISSING';
    throw e;
  }

  let lastError = null;

  for (let attempt = 0; attempt < TICKET_ID_RETRIES; attempt++) {
    const ticketId = buildTicketId();

    try {
      const created = await prisma.$transaction(async (tx) => {
        if (typeof tx.ticket === 'undefined' || typeof tx.ticket.create !== 'function') {
          const e = new Error('Prisma transaction client is missing the Ticket model API. Ensure prisma client is generated.');
          e.code = 'PRISMA_MODEL_MISSING';
          throw e;
        }

        const ticket = await tx.ticket.create({
          data: {
            ticketId,
            fullName: fullName.trim(),
            email: email.toLowerCase(),
            subject: subject.trim(),
            message: message.trim(),
            userId: userId || null,
            orderId: orderId || null,
            category,
            status: 'open',
            resolutionStatus: 'unresolved',
            priority: 'medium',
            estimatedResponse: '24-48 hours'
          }
        });

        if (Array.isArray(products) && products.length > 0) {
          const prodCreates = products.map(p => ({
            id: undefined,
            ticketId: ticket.id,
            productId: p.productId,
            productName: p.productName.trim(),
            action: p.action
          }));

          // createMany not used to ensure relation integrity and createdAt defaults
          for (const pc of prodCreates) {
            await tx.ticketProduct.create({ data: pc });
          }
        }

        return ticket;
      });

      return created; // success
    } catch (err) {
      lastError = err;
      // Check for unique constraint violation on ticketId
      const msg = String(err?.message || err);
      if (msg.includes('unique') || msg.includes('UNIQUE') || msg.includes('duplicate key') ) {
        // collision, retry
        continue;
      }
      // Other errors - throw
      throw err;
    }
  }

  // If we reach here, all retries failed due to collisions or lastError
  const error = new Error('Failed to generate unique ticketId');
  error.cause = lastError;
  throw error;
}

export default { createTicket };
