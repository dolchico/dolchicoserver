#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma.js';

const usage = `Usage: node scripts/seed_products.js [path/to/products.json]
If no path is provided, the script looks for scripts/products.json`;

const main = async () => {
  try {
    const inputPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.resolve(process.cwd(), 'scripts', 'products.json');
    if (!fs.existsSync(inputPath)) {
      console.error('Products JSON not found at', inputPath);
      console.log(usage);
      process.exit(1);
    }
    const raw = fs.readFileSync(inputPath, 'utf8');
    const payload = JSON.parse(raw);
    if (!Array.isArray(payload)) {
      console.error('Products JSON must be an array of product objects');
      process.exit(1);
    }

    console.log(`Loading ${payload.length} product(s) from ${inputPath}`);

    const categoryCache = new Map(); // name -> category row

    for (const p of payload) {
      // Basic validation and defaults
      if (!p.name || !p.price) {
        console.warn('Skipping product missing required fields (name or price):', p);
        continue;
      }

      const categoryName = p.category && p.category.name ? p.category.name : (p.categoryName || 'Default');
      const subcategoryName = p.subcategory && p.subcategory.name ? p.subcategory.name : (p.subcategoryName || 'Default');
      const grouping = p.subcategory && p.subcategory.grouping ? p.subcategory.grouping : (p.grouping || 'Default Group');

      // Upsert category by name (name is unique)
      let category = categoryCache.get(categoryName);
      if (!category) {
        try {
          category = await prisma.category.upsert({
            where: { name: categoryName },
            create: {
              name: categoryName,
              description: p.category && p.category.description ? p.category.description : null,
              imageUrl: p.category && p.category.imageUrl ? p.category.imageUrl : null,
              isActive: p.category && typeof p.category.isActive === 'boolean' ? p.category.isActive : true
            },
            update: {
              description: p.category && p.category.description ? p.category.description : undefined,
              imageUrl: p.category && p.category.imageUrl ? p.category.imageUrl : undefined,
              isActive: p.category && typeof p.category.isActive === 'boolean' ? p.category.isActive : undefined
            }
          });
          categoryCache.set(categoryName, category);
        } catch (err) {
          console.error('Failed to upsert category', categoryName, err.message || err);
          continue;
        }
      }

      // Ensure subcategory exists for this category (unique constraint on name+categoryId)
      let subcategory = null;
      try {
        subcategory = await prisma.subcategory.findFirst({ where: { name: subcategoryName, categoryId: category.id } });
        if (!subcategory) {
          subcategory = await prisma.subcategory.create({ data: {
            name: subcategoryName,
            grouping: grouping,
            categoryId: category.id,
            isActive: p.subcategory && typeof p.subcategory.isActive === 'boolean' ? p.subcategory.isActive : true
          }});
        }
      } catch (err) {
        console.error('Failed to find/create subcategory', subcategoryName, 'for category', categoryName, err.message || err);
        continue;
      }

      // Create product
      try {
        const created = await prisma.product.create({ data: {
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          image: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []),
          categoryId: category.id,
          subcategoryId: subcategory.id,
          sizes: Array.isArray(p.sizes) ? p.sizes : (p.sizes ? [p.sizes] : []),
          bestseller: typeof p.bestseller === 'boolean' ? p.bestseller : false,
          isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
          stock: Number.isFinite(p.stock) ? p.stock : (p.stock ? Number(p.stock) : 0),
          date: p.date || Date.now()
        }});
        console.log('Created product id=', created.id, 'name=', created.name);
      } catch (err) {
        console.error('Failed to create product', p.name, err.message || err);
      }
    }

    console.log('Done seeding products');
  } catch (err) {
    console.error('Fatal error', err);
  } finally {
    await prisma.$disconnect();
  }
};

main();
