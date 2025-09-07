import * as CategoryService from '../services/category.service.js';

const handleRequest = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
};

// --- Category Controllers ---
export const createCategory = handleRequest(async (req, res) => {
  const category = await CategoryService.createCategory(req.body);
  res.status(201).json(category);
});

export const updateCategory = handleRequest(async (req, res) => {
  const category = await CategoryService.updateCategory(req.params.id, req.body);
  res.status(200).json(category);
});

export const deleteCategory = handleRequest(async (req, res) => {
  await CategoryService.deleteCategory(req.params.id);
  res.status(204).send();
});

export const getAllCategories = handleRequest(async (req, res) => {
  const categories = await CategoryService.getAllCategories();
  res.status(200).json(categories);
});

export const getCategoryByName = handleRequest(async (req, res) => {
  const category = await CategoryService.getCategoryByName(req.params.name);
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }
  res.status(200).json(category);
});

// --- Subcategory Controllers ---
export const addSubcategory = handleRequest(async (req, res) => {
  const subcategory = await CategoryService.addSubcategory(req.params.id, req.body);
  res.status(201).json(subcategory);
});

export const updateSubcategory = handleRequest(async (req, res) => {
    const subcategory = await CategoryService.updateSubcategory(req.params.id, req.body);
    res.status(200).json(subcategory);
});

export const deleteSubcategory = handleRequest(async (req, res) => {
    await CategoryService.deleteSubcategory(req.params.id);
    res.status(204).send();
});

export const getSubcategoriesByCategoryName = handleRequest(async (req, res) => {
  const subcategories = await CategoryService.getSubcategoriesByCategoryName(req.params.name);
  res.status(200).json(subcategories);
});

export const getSubcategoriesByGrouping = handleRequest(async (req, res) => {
    const subcategories = await CategoryService.getSubcategoriesByGrouping(req.params.grouping);
    res.status(200).json(subcategories);
});

// --- Offer Controllers ---
export const addOffer = handleRequest(async (req, res) => {
  const offer = await CategoryService.addOffer(req.params.id, req.body);
  res.status(201).json(offer);
});

export const updateOffer = handleRequest(async (req, res) => {
    const offer = await CategoryService.updateOffer(req.params.id, req.body);
    res.status(200).json(offer);
});

export const deleteOffer = handleRequest(async (req, res) => {
    await CategoryService.deleteOffer(req.params.id);
    res.status(204).send();
});

export const getOffersByCategoryName = handleRequest(async (req, res) => {
  const offers = await CategoryService.getOffersByCategoryName(req.params.name);
  res.status(200).json(offers);
});

// --- Bulk Initialization Controller ---
export const initializeData = handleRequest(async (req, res) => {
  const result = await CategoryService.initializeData(req.body);
  res.status(201).json({ message: 'Data initialized successfully', data: result });
});