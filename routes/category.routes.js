import { Router } from 'express';
import * as CategoryController from '../controllers/category.controller.js';
// --- CHANGE HERE: Import your actual middleware ---
import { ensureAuthWithStatus, ensureRole } from '../middleware/authMiddleware.js';

const router = Router();
const adminRouter = Router();
const publicRouter = Router();

// --- Admin Routes (Protected) ---
// Note: We apply the middleware directly to the adminRouter.
// 1. ensureAuthWithStatus: Verifies JWT and checks if the user account is active.
// 2. ensureRole(['ADMIN']): Verifies the user has the 'ADMIN' role.
adminRouter.use(ensureAuthWithStatus, ensureRole(['ADMIN']));``

// Category routes
adminRouter.post('/categories', CategoryController.createCategory);
adminRouter.put('/categories/:id', CategoryController.updateCategory);
adminRouter.delete('/categories/:id', CategoryController.deleteCategory);
adminRouter.post('/categories/initialize', CategoryController.initializeData);

// Add subcategories and offers to a specific category
adminRouter.post('/categories/:id/subcategories', CategoryController.addSubcategory);
adminRouter.post('/categories/:id/offers', CategoryController.addOffer);

// Standalone subcategory and offer management
adminRouter.put('/subcategories/:id', CategoryController.updateSubcategory);
adminRouter.delete('/subcategories/:id', CategoryController.deleteSubcategory);
adminRouter.put('/offers/:id', CategoryController.updateOffer);
adminRouter.delete('/offers/:id', CategoryController.deleteOffer);


// --- Public Routes (Read-only, no auth needed) ---
publicRouter.get('/categories', CategoryController.getAllCategories);
publicRouter.get('/categories/:name', CategoryController.getCategoryByName);
publicRouter.get('/categories/:name/subcategories', CategoryController.getSubcategoriesByCategoryName);
publicRouter.get('/categories/:name/offers', CategoryController.getOffersByCategoryName);
publicRouter.get('/subcategories/grouping/:grouping', CategoryController.getSubcategoriesByGrouping);

// Combine routers
// All routes starting with /admin will first go through the adminRouter middleware chain
router.use('/admin', adminRouter); 
router.use(publicRouter);

export default router;