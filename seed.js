import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. Define the structure for Categories and their Subcategories ---
const categoryData = [
  {
    name: "Men",
    description: "A wide range of men's fashion and apparel.",
    subcategories: [
      { name: "Topwear", grouping: "Apparel" },
      { name: "Bottomwear", grouping: "Apparel" },
      { name: "Jackets", grouping: "Outerwear" },
    ]
  },
  {
    name: "Women",
    description: "Stylish and modern women's fashion.",
    subcategories: [
      { name: "Topwear", grouping: "Apparel" },
      { name: "Bottomwear", grouping: "Apparel" },
      { name: "Dresses", grouping: "Apparel" },
      { name: "Jackets", grouping: "Outerwear" },
    ]
  },
  {
    name: "Unisex",
    description: "Versatile accessories and apparel for everyone.",
    subcategories: [
      { name: "Topwear", grouping: "Apparel" },
      { name: "Accessories", grouping: "Gear" },
      { name: "Footwear", grouping: "Gear" },
    ]
  },
];

// --- 2. Define the Product data ---
// Products still use string names for category/subcategory for easy mapping.
const productData = [
    // --- Men's Products ---
    {
      name: "Men's Classic White T-Shirt",
      description: "A timeless and versatile 100% cotton white t-shirt, perfect for any wardrobe. A staple for every man.",
      price: 1499,
      category: "Men",
      subCategory: "Topwear",
      bestseller: true,
      sizes: ["S", "M", "L", "XL", "XXL"],
      stock: 100,
      image: [
        "https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },
    {
      name: "Men's Black Graphic Tee",
      description: "A comfortable black t-shirt with a minimalist graphic print. Made with soft, breathable cotton.",
      price: 1799,
      category: "Men",
      subCategory: "Topwear",
      bestseller: true,
      sizes: ["S", "M", "L", "XL"],
      stock: 85,
      image: [
        "https://images.unsplash.com/photo-1503341504253-dff489862571?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3",
        "https://images.unsplash.com/photo-1503341338985-c0477be52513?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },
    {
      name: "Men's Slim-Fit Chinos",
      description: "Versatile slim-fit chinos crafted from comfortable stretch cotton twill.",
      price: 3499,
      category: "Men",
      subCategory: "Bottomwear",
      bestseller: true,
      sizes: ["30", "32", "34", "36"],
      stock: 120,
      image: [
        "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3",
        "https://images.unsplash.com/photo-1604176354204-926873782855?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },
    {
      name: "Men's Classic Denim Jacket",
      description: "A rugged and timeless denim jacket, perfect for layering in any season. Features chest pockets and button closure.",
      price: 4599,
      category: "Men",
      subCategory: "Jackets",
      bestseller: true,
      sizes: ["M", "L", "XL"],
      stock: 60,
      image: [
        "https://images.unsplash.com/photo-1543087904-723a3b0a23b3?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3",
        "https://images.unsplash.com/photo-1604176354204-926873782855?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },
    
    // --- Women's Products ---
    {
      name: "Women's High-Rise Skinny Jeans",
      description: "Flattering high-rise skinny jeans made with stretch denim for ultimate comfort and style.",
      price: 3999,
      category: "Women",
      subCategory: "Bottomwear",
      bestseller: true,
      sizes: ["XS", "S", "M", "L"],
      stock: 150,
      image: [
        "https://images.unsplash.com/photo-1509319117193-57bab727e09d?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3",
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },
    {
      name: "Women's Floral Maxi Dress",
      description: "An elegant floral maxi dress with a flowing silhouette, perfect for summer occasions and beach vacations.",
      price: 5999,
      category: "Women",
      subCategory: "Dresses",
      bestseller: false,
      sizes: ["S", "M", "L"],
      stock: 70,
      image: [
        "https://images.unsplash.com/photo-1572804013427-4d7ca7268211?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3",
        "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },
    {
      name: "Women's Classic Trench Coat",
      description: "A sophisticated and timeless double-breasted trench coat for a polished look. Water-resistant fabric.",
      price: 8999,
      category: "Women",
      subCategory: "Jackets",
      bestseller: true,
      sizes: ["S", "M", "L"],
      stock: 40,
      image: [
        "https://images.unsplash.com/photo-1575939238474-c8ada33355d6?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3",
        "https://images.unsplash.com/photo-1616852367931-a83d472a74d9?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },
    {
      name: "Women's Off-Shoulder Blouse",
      description: "A trendy and feminine off-shoulder top made from lightweight, breathable fabric.",
      price: 2299,
      category: "Women",
      subCategory: "Topwear",
      bestseller: true,
      sizes: ["S", "M", "L"],
      stock: 90,
      image: [
        "https://images.unsplash.com/photo-1525399938183-5838d7a12391?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3",
        "https://images.unsplash.com/photo-1563178406-41fb3927b944?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },

    // --- Unisex Products ---
    {
      name: "Unisex Oversized Hoodie",
      description: "A cozy and stylish oversized hoodie made from a premium fleece blend. Perfect for a relaxed, comfortable fit.",
      price: 4999,
      category: "Unisex",
      subCategory: "Topwear",
      bestseller: false,
      sizes: ["M", "L", "XL", "XXL"],
      stock: 110,
      image: [
        "https://images.unsplash.com/photo-1564557287550-7f26512816e3?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3",
        "https://images.unsplash.com/photo-1556821855-33b63cc67527?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },
    {
      name: "Unisex Low-Top Sneakers",
      description: "Versatile and comfortable low-top sneakers that complement any casual outfit. Features a durable canvas upper.",
      price: 3499,
      category: "Unisex",
      subCategory: "Footwear",
      bestseller: true,
      sizes: ["7", "8", "9", "10", "11"],
      stock: 200,
      image: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3",
        "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },
    {
      name: "Unisex Aviator Sunglasses",
      description: "Classic aviator sunglasses with polarized lenses for 100% UV protection. Timeless style.",
      price: 2499,
      category: "Unisex",
      subCategory: "Accessories",
      bestseller: true,
      sizes: ["One Size"],
      stock: 300,
      image: [
        "https://images.unsplash.com/photo-1577803645773-f92475de7001?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3",
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=60&ixlib-rb-4.0.3"
      ]
    },
];


async function main() {
  console.log('Start seeding...');

  // --- Clean the database in the correct order to avoid foreign key errors ---
  console.log('Deleting existing products...');
  await prisma.product.deleteMany();
  console.log('Deleting existing subcategories...');
  await prisma.subcategory.deleteMany();
  console.log('Deleting existing categories...');
  await prisma.category.deleteMany();

  // --- Seed Categories and Subcategories and store their created objects ---
  const createdCategories = {};
  const createdSubcategories = {};

  for (const cat of categoryData) {
    console.log(`Creating category: ${cat.name}`);
    const category = await prisma.category.create({
      data: {
        name: cat.name,
        description: cat.description,
        // Create related subcategories at the same time
        subcategories: {
          create: cat.subcategories,
        },
      },
      include: {
        subcategories: true // Include the created subcategories in the result
      }
    });

    createdCategories[cat.name] = category;
    
    // Store the created subcategories in a map for easy lookup
    for (const sub of category.subcategories) {
        // Create a unique key like "Men_Topwear"
        const key = `${cat.name}_${sub.name}`;
        createdSubcategories[key] = sub;
    }
  }
  
  console.log('Finished seeding categories and subcategories.');

  // --- Seed Products using the IDs of the categories/subcategories we just created ---
  console.log('Seeding products...');
  for (const p of productData) {
    // Find the IDs from our maps
    const category = createdCategories[p.category];
    const subcategory = createdSubcategories[`${p.category}_${p.subCategory}`];
    
    if (!category || !subcategory) {
        console.warn(`Skipping product "${p.name}" because its category or subcategory could not be found.`);
        continue;
    }

    await prisma.product.create({
      data: {
        name: p.name,
        description: p.description,
        price: p.price,
        bestseller: p.bestseller,
        sizes: p.sizes,
        image: p.image,
        stock: p.stock,
        date: BigInt(Date.now()), 
        // Connect to the category and subcategory using their IDs
        categoryId: category.id,
        subcategoryId: subcategory.id,
      },
    });
    console.log(`Created product: ${p.name}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
