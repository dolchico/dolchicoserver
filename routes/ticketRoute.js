import express from 'express';
import ticketController from '../controllers/ticket.controller.js';

const router = express.Router();

router.post('/generateticket', ticketController.createTicketHandler);

export default router;
