// services/productService.js
import prisma from '../lib/prisma.js';

export const createProduct = async (data) => {
  return await prisma.product.create({ data });
};

export const getAllProducts = async () => {
  return await prisma.product.findMany();
};

export const deleteProductById = async (id) => {
  return await prisma.product.delete({ where: { id: Number(id) } });
};

export const getProductById = async (id) => {
  return await prisma.product.findUnique({
    where: { id: Number(id) }, // This line correctly attempts to convert the id to a number
  });
};