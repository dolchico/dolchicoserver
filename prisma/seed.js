import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    name: "Men's Classic White T-Shirt",
    description: "A timeless and versatile 100% cotton white t-shirt, perfect for any wardrobe.",
    price: 1499,
    category: "Men",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["S", "M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1583743814966-8936f37f4678?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's High-Rise Skinny Jeans",
    description: "Flattering high-rise skinny jeans made with stretch denim for comfort and style.",
    price: 3999,
    category: "Women",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["XS", "S", "M", "L"],
    images: [
      "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Unisex Oversized Hoodie",
    description: "A cozy and stylish oversized hoodie made from premium fleece blend.",
    price: 4999,
    category: "Unisex",
    subCategory: "Topwear",
    bestseller: false,
    sizes: ["M", "L", "XL", "XXL"],
    images: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Slim-Fit Chinos",
    description: "Versatile slim-fit chinos crafted from comfortable stretch cotton.",
    price: 3499,
    category: "Men",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["30", "32", "34", "36"],
    images: [
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Floral Maxi Dress",
    description: "An elegant floral maxi dress with flowing silhouette, perfect for summer occasions.",
    price: 5999,
    category: "Women",
    subCategory: "Dresses",
    bestseller: false,
    sizes: ["S", "M", "L"],
    images: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1572804013427-4d7ca7268211?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Denim Jacket",
    description: "A rugged and timeless denim jacket, perfect for layering in any season.",
    price: 4599,
    category: "Men",
    subCategory: "Jackets",
    bestseller: true,
    sizes: ["M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1604176354204-926873782855?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Ribbed Knit Sweater",
    description: "A chic and comfortable ribbed knit sweater with classic crewneck design.",
    price: 3299,
    category: "Women",
    subCategory: "Topwear",
    bestseller: false,
    sizes: ["XS", "S", "M"],
    images: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1519409393393-214e2a8298a2?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Leather Biker Jacket",
    description: "A classic biker jacket made from genuine leather with durable metal hardware.",
    price: 12999,
    category: "Men",
    subCategory: "Jackets",
    bestseller: true,
    sizes: ["M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Pleated Midi Skirt",
    description: "An elegant and versatile pleated midi skirt that flows beautifully.",
    price: 3799,
    category: "Women",
    subCategory: "Bottomwear",
    bestseller: false,
    sizes: ["S", "M", "L"],
    images: [
      "https://images.unsplash.com/photo-1583496661160-fb5886a13d74?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Performance Joggers",
    description: "Lightweight and flexible performance joggers designed for comfort and athletics.",
    price: 2999,
    category: "Men",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["S", "M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1563319251-83c9c2f04368?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Classic Trench Coat",
    description: "A sophisticated and timeless double-breasted trench coat for a polished look.",
    price: 8999,
    category: "Women",
    subCategory: "Jackets",
    bestseller: true,
    sizes: ["S", "M", "L"],
    images: [
      "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1616852367931-a83d472a74d9?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Unisex Beanie Hat",
    description: "A soft, warm, and stylish beanie hat perfect for cold weather.",
    price: 999,
    category: "Unisex",
    subCategory: "Accessories",
    bestseller: false,
    sizes: ["One Size"],
    images: [
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1575428652377-a3d80e281498?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Formal Dress Shirt",
    description: "A crisp, slim-fit formal dress shirt made from wrinkle-resistant cotton.",
    price: 2599,
    category: "Men",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1598554747448-3693c35467e4?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1603252109612-24fa63c053c3?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Athleisure Leggings",
    description: "High-waisted, squat-proof leggings designed for performance and style.",
    price: 2499,
    category: "Women",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["XS", "S", "M", "L"],
    images: [
      "https://images.unsplash.com/photo-1506629905607-bb5e3c1e3b8d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Wool Peacoat",
    description: "A classic double-breasted peacoat made from a warm wool blend.",
    price: 9999,
    category: "Men",
    subCategory: "Jackets",
    bestseller: false,
    sizes: ["M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1591121087994-32a76f669a8b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1605862598339-d26baff4d32e?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Satin Cami Top",
    description: "A luxurious and versatile satin camisole top that can be dressed up or down.",
    price: 1899,
    category: "Women",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["XS", "S", "M"],
    images: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1579744415849-c451b6a15e61?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Graphic Print Sweatshirt",
    description: "A comfortable crewneck sweatshirt featuring a unique graphic print.",
    price: 3199,
    category: "Men",
    subCategory: "Topwear",
    bestseller: false,
    sizes: ["S", "M", "L"],
    images: [
      "https://images.unsplash.com/photo-1614252366333-c24cca63c2cb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Wide-Leg Trousers",
    description: "Effortlessly chic wide-leg trousers that offer both comfort and style.",
    price: 4299,
    category: "Women",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["S", "M", "L"],
    images: [
      "https://images.unsplash.com/photo-1529391409740-59f2618d3d52?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1594611545628-3b9518a2879f?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Polo Shirt",
    description: "A classic polo shirt made from breathable pique cotton.",
    price: 1999,
    category: "Men",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["S", "M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1554972302-389547563458?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1622519360341-35b88849b20d?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Cropped Denim Jacket",
    description: "A modern cropped denim jacket perfect for layering over dresses or tops.",
    price: 4799,
    category: "Women",
    subCategory: "Jackets",
    bestseller: false,
    sizes: ["XS", "S", "M"],
    images: [
      "https://images.unsplash.com/photo-1595950653106-6c986e588e2f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1606760227091-3ddc9f2852b4?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Cargo Shorts",
    description: "Durable and practical cargo shorts with multiple pockets for functionality.",
    price: 2199,
    category: "Men",
    subCategory: "Bottomwear",
    bestseller: false,
    sizes: ["30", "32", "34", "36"],
    images: [
      "https://images.unsplash.com/photo-1591130901961-369420650989?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1603344287439-447a19c72c1c?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Off-Shoulder Top",
    description: "A trendy and feminine off-shoulder top made from lightweight fabric.",
    price: 2299,
    category: "Women",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["S", "M", "L"],
    images: [
      "https://images.unsplash.com/photo-1525399938183-5838d7a12391?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1563178406-41fb3927b944?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Unisex Classic Sneakers",
    description: "Versatile and comfortable low-top sneakers that complement any casual outfit.",
    price: 3499,
    category: "Unisex",
    subCategory: "Footwear",
    bestseller: true,
    sizes: ["7", "8", "9", "10", "11"],
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1595950653106-6c986e588e2f?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Flannel Shirt",
    description: "A soft and warm flannel shirt with a classic plaid pattern.",
    price: 2899,
    category: "Men",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1587579732858-696a66708767?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Jumpsuit",
    description: "A stylish and comfortable one-piece jumpsuit perfect for any occasion.",
    price: 5499,
    category: "Women",
    subCategory: "Dresses",
    bestseller: false,
    sizes: ["S", "M", "L"],
    images: [
      "https://images.unsplash.com/photo-1596958414436-3b89b88496ce?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1574695333990-5a34a8e35a11?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Textured Pullover",
    description: "A sophisticated pullover sweater with a unique textured knit.",
    price: 3599,
    category: "Men",
    subCategory: "Topwear",
    bestseller: false,
    sizes: ["M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1610384104075-e8391c0598b9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1619208983086-07b97c0f1627?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Faux Leather Skirt",
    description: "A chic A-line skirt made from high-quality faux leather.",
    price: 2999,
    category: "Women",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["XS", "S", "M"],
    images: [
      "https://images.unsplash.com/photo-1586799583113-55d648259cb7?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1597585092621-83c39a8c6b75?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Men's Linen Trousers",
    description: "Lightweight and breathable linen trousers, perfect for warm weather.",
    price: 3899,
    category: "Men",
    subCategory: "Bottomwear",
    bestseller: false,
    sizes: ["30", "32", "34"],
    images: [
      "https://images.unsplash.com/photo-1605518215571-4f5198e36706?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1621335829175-95f36b834433?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Women's Bodycon Dress",
    description: "A stunning and form-fitting bodycon dress for a night out.",
    price: 4999,
    category: "Women",
    subCategory: "Dresses",
    bestseller: true,
    sizes: ["XS", "S", "M"],
    images: [
      "https://images.unsplash.com/photo-1595777457587-43798a6f3152?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1597096051989-3d4c38210e74?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    name: "Unisex Canvas Tote Bag",
    description: "A durable and spacious canvas tote bag for everyday use.",
    price: 1599,
    category: "Unisex",
    subCategory: "Accessories",
    bestseller: false,
    sizes: ["One Size"],
    images: [
      "https://images.unsplash.com/photo-1572196289918-f8a84a3234a2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1544813545-169b433b7d76?auto=format&fit=crop&w=800&q=80"
    ]
  }
];

async function main() {
  console.log('Start seeding...');

  await prisma.product.deleteMany();
  console.log('Deleted records in product table');

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        subCategory: p.subCategory,
        bestseller: p.bestseller,
        sizes: p.sizes,
        image: p.images,
        date: Date.now(),
      },
    });
    console.log(`Created product with id: ${product.id}`);
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
