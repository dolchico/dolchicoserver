/**
 * The Router Layer for Cart functionality.
 * This file defines the API endpoints related to the cart.
 * It uses Express.Router to create a modular set of routes that can be
 * mounted on the main application.
 */

import express from 'express';
import { getCart, addItem, updateItem, removeItem } from '../controllers/cartController.js';
import authUser from '../middleware/auth.js'; // Your authentication middleware

// Create a new router instance. This works like a mini-Express app.
const cartRouter = express.Router();

// IMPORTANT: Apply the authentication middleware to ALL routes defined in this file.
// `cartRouter.use()` adds middleware to every route that follows it.
// This ensures that no one can access the cart API without being logged in.
cartRouter.use(authUser);

// --- Define RESTful Routes ---
// The routes follow REST conventions for managing a resource ('cart').

// Route: GET /api/cart
// Method: GET
// Purpose: Retrieve the entire user cart.
// Maps to: getCart controller function.
cartRouter.get('/', getCart);

// Route: POST /api/cart/items
// Method: POST
// Purpose: Add a new item to the cart.
// Maps to: addItem controller function.
cartRouter.post('/items', addItem);

// Route: PUT /api/cart/items/:cartItemId
// Method: PUT
// Purpose: Update a specific item in the cart (e.g., change its quantity).
// `:cartItemId` is a URL parameter that will be available in `req.params`.
// Maps to: updateItem controller function.
cartRouter.put('/items/:cartItemId', updateItem);

// Route: DELETE /api/cart/items/:cartItemId
// Method: DELETE
// Purpose: Remove a specific item from the cart.
// Maps to: removeItem controller function.
cartRouter.delete('/items/:cartItemId', removeItem);

// Export the configured router so it can be used in `server.js`.
export default cartRouter;
