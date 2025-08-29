import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  // Men's Topwear (8)
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
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fHQlMjBzaGlydHxlbnwwfHwwfHx8MA%3D%3D",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dCUyMHNoaXJ0fGVufDB8fDB8fHww"
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
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1503341504253-dff489862571?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8bWVuJTIwdCUyMHNoaXJ0fGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1503341338985-c0477be52513?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTl8fG1lbiUyMHQlMjBzaGlydHxlbnwwfHwwfHx8MA%3D%3D"
    ]
  },
  {
    name: "Men's Formal Oxford Shirt",
    description: "A crisp, slim-fit formal dress shirt made from wrinkle-resistant cotton. Perfect for the office or formal events.",
    price: 2599,
    category: "Men",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["M", "L", "XL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1603252109612-24fa63c053c3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fG1lbiUyMHNoaXJ0fGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1598554747448-3693c35467e4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fG1lbiUyMHNoaXJ0fGVufDB8fDB8fHww"
    ]
  },
  {
    name: "Men's Classic Polo",
    description: "A classic polo shirt made from breathable pique cotton. A smart-casual essential.",
    price: 1999,
    category: "Men",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["S", "M", "L", "XL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1622519360341-35b88849b20d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8cG9sbyUyMHNoaXJ0fGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1554972302-389547563458?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHBvbG8lMjBzaGlydHxlbnwwfHwwfHx8MA%3D%3D"
    ]
  },
  {
    name: "Men's Plaid Flannel Shirt",
    description: "A soft and warm flannel shirt with a classic plaid pattern. Perfect for layering.",
    price: 2899,
    category: "Men",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["M", "L", "XL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Zmxhbm5lbCUyMHNoaXJ0fGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1587579732858-696a66708767?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Zmxhbm5lbCUyMHNoaXJ0fGVufDB8fDB8fHww"
    ]
  },
  {
    name: "Men's Crewneck Sweatshirt",
    description: "A comfortable crewneck sweatshirt featuring a unique graphic print. Made from a soft cotton blend.",
    price: 3199,
    category: "Men",
    subCategory: "Topwear",
    bestseller: false,
    sizes: ["S", "M", "L"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3dlYXRzaGlydHxlbnwwfHwwfHx8MA%3D%3D",
      "https://images.unsplash.com/photo-1614252366333-c24cca63c2cb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHN3ZWF0c2hpcnR8ZW58MHx8MHx8fDA%3D"
    ]
  },
  {
    name: "Men's Textured Pullover Sweater",
    description: "A sophisticated pullover sweater with a unique textured knit. Ideal for smart-casual looks.",
    price: 3599,
    category: "Men",
    subCategory: "Topwear",
    bestseller: false,
    sizes: ["M", "L", "XL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1610384104075-e8391c0598b9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8bWVucyUyMHN3ZWF0ZXJ8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1619208983086-07b97c0f1627?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fG1lbnMlMjBzd2VhdGVyfGVufDB8fDB8fHww"
    ]
  },
  {
    name: "Men's Henley Long Sleeve",
    description: "A versatile long-sleeve Henley shirt with a three-button placket. Great for layering or wearing on its own.",
    price: 2299,
    category: "Men",
    subCategory: "Topwear",
    bestseller: false,
    sizes: ["S", "M", "L", "XL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1512435288292-a7d5392527b1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aGVubGV5JTIwc2hpcnR8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1627225793944-383791a9b2b1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGVubGV5JTIwc2hpcnR8ZW58MHx8MHx8fDA%3D"
    ]
  },

  // Men's Bottomwear (4)
  {
    name: "Men's Slim-Fit Chinos",
    description: "Versatile slim-fit chinos crafted from comfortable stretch cotton twill.",
    price: 3499,
    category: "Men",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["30", "32", "34", "36"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2hpbm9zfGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y2hpbm9zfGVufDB8fDB8fHww"
    ]
  },
  {
    name: "Men's Performance Joggers",
    description: "Lightweight and flexible performance joggers designed for comfort and athletics. Features zip pockets.",
    price: 2999,
    category: "Men",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["S", "M", "L", "XL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1563319251-83c9c2f04368?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fGpvZ2dlcnN8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8am9nZ2Vyc3xlbnwwfHwwfHx8MA%3D%3D"
    ]
  },
  {
    name: "Men's Cargo Shorts",
    description: "Durable and practical cargo shorts with multiple pockets for functionality. Perfect for outdoor activities.",
    price: 2199,
    category: "Men",
    subCategory: "Bottomwear",
    bestseller: false,
    sizes: ["30", "32", "34", "36"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1603344287439-447a19c72c1c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2FyZ28lMjBzaG9ydHN8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1591130901961-369420650989?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2FyZ28lMjBzaG9ydHN8ZW58MHx8MHx8fDA%3D"
    ]
  },
  {
    name: "Men's Classic Denim Jeans",
    description: "Classic straight-fit denim jeans made with durable, high-quality fabric. A wardrobe must-have.",
    price: 4299,
    category: "Men",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["30", "32", "34", "36", "38"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1602293589914-9FF05f8b2ca4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8amVhbnN8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8amVhbnN8ZW58MHx8MHx8fDA%3D"
    ]
  },

  // Men's Jackets (3)
  {
    name: "Men's Classic Denim Jacket",
    description: "A rugged and timeless denim jacket, perfect for layering in any season. Features chest pockets and button closure.",
    price: 4599,
    category: "Men",
    subCategory: "Jackets",
    bestseller: true,
    sizes: ["M", "L", "XL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1604176354204-926873782855?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8ZGVuaW0lMjBqYWNrZXR8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8ZGVuaW0lMjBqYWNrZXR8ZW58MHx8MHx8fDA%3D"
    ]
  },
  {
    name: "Men's Leather Biker Jacket",
    description: "A classic biker jacket made from genuine leather with durable metal hardware and an asymmetrical zip.",
    price: 12999,
    category: "Men",
    subCategory: "Jackets",
    bestseller: true,
    sizes: ["M", "L", "XL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGVhdGhlciUyMGphY2tldHxlbnwwfHwwfHx8MA%3D%3D",
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bGVhdGhlciUyMGphY2tldHxlbnwwfHwwfHx8MA%3D%3D"
    ]
  },
  {
    name: "Men's Lightweight Bomber Jacket",
    description: "A stylish and lightweight bomber jacket, perfect for transitional weather. Features ribbed cuffs and hem.",
    price: 5299,
    category: "Men",
    subCategory: "Jackets",
    bestseller: false,
    sizes: ["S", "M", "L", "XL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1591852801-757c3905080b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Ym9tYmVyJTIwamFja2V0fGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1517616179509-db7c1514a7db?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8Ym9tYmVyJTIwamFja2V0fGVufDB8fDB8fHww"
    ]
  },
  
  // Women's Topwear (5)
  {
    name: "Women's Ribbed Knit Sweater",
    description: "A chic and comfortable ribbed knit sweater with classic crewneck design. Perfect for a cozy yet stylish look.",
    price: 3299,
    category: "Women",
    subCategory: "Topwear",
    bestseller: false,
    sizes: ["XS", "S", "M"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1519409393393-214e2a8298a2?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHdvbWVucyUyMHN3ZWF0ZXJ8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8d29tZW5zJTIwc3dlYXRlcnxlbnwwfHwwfHx8MA%3D%3D"
    ]
  },
  {
    name: "Women's Silk Satin Cami",
    description: "A luxurious and versatile satin camisole top that can be dressed up or down. Features adjustable straps.",
    price: 1899,
    category: "Women",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["XS", "S", "M"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8d29tZW4lMjB0b3B8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1579744415849-c451b6a15e61?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8c2F0aW4lMjB0b3B8ZW58MHx8MHx8fDA%3D"
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
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1525399938183-5838d7a12391?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8b2ZmJTIwc2hvdWxkZXIlMjB0b3B8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1563178406-41fb3927b944?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8b2ZmJTIwc2hvdWxkZXIlMjB0b3B8ZW58MHx8MHx8fDA%3D"
    ]
  },
  {
    name: "Women's Oversized Graphic T-Shirt",
    description: "A cool and casual oversized t-shirt with a vintage-inspired graphic. Perfect for a relaxed fit.",
    price: 1999,
    category: "Women",
    subCategory: "Topwear",
    bestseller: false,
    sizes: ["S", "M", "L", "XL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1554412933-574a44333519?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d29tZW4lMjBncmFwaGljJTIwdGVlfGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1581368135215-09b9d12e88a3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8d29tZW4lMjBncmFwaGljJTIwdGVlfGVufDB8fDB8fHww"
    ]
  },
  {
    name: "Women's Classic V-Neck Tee",
    description: "A soft, everyday v-neck t-shirt made from a premium cotton-modal blend for a flattering drape.",
    price: 1299,
    category: "Women",
    subCategory: "Topwear",
    bestseller: true,
    sizes: ["XS", "S", "M", "L"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1622442442344-3c8091a0f823?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d29tZW4lMjB2JTIwbmVjayUyMHRlZXxlbnwwfHwwfHx8MA%3D%3D",
      "https://images.unsplash.com/photo-1589109736809-399a9108c90b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d29tZW4lMjB2JTIwbmVjayUyMHRlZXxlbnwwfHwwfHx8MA%3D%3D"
    ]
  },

  // Women's Bottomwear (4)
  {
    name: "Women's High-Rise Skinny Jeans",
    description: "Flattering high-rise skinny jeans made with stretch denim for ultimate comfort and style.",
    price: 3999,
    category: "Women",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["XS", "S", "M", "L"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8am9nZ2Vyc3xlbnwwfHwwfHx8MA%3D%3D",
      "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8c2tpbm55JTIwamVhbnN8ZW58MHx8MHx8fDA%3D"
    ]
  },
  {
    name: "Women's Pleated Midi Skirt",
    description: "An elegant and versatile pleated midi skirt that flows beautifully with every step.",
    price: 3799,
    category: "Women",
    subCategory: "Bottomwear",
    bestseller: false,
    sizes: ["S", "M", "L"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8c2tpcnR8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1583496661160-fb5886a13d74?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2tpcnR8ZW58MHx8MHx8fDA%3D"
    ]
  },
  {
    name: "Women's Athleisure Leggings",
    description: "High-waisted, squat-proof leggings designed for performance and style. Features a convenient side pocket.",
    price: 2499,
    category: "Women",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["XS", "S", "M", "L"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1551632811-561732d1e306?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGVnZ2luZ3N8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1506629905607-bb5e3c1e3b8d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bGVnZ2luZ3N8ZW58MHx8MHx8fDA%3D"
    ]
  },
  {
    name: "Women's Wide-Leg Trousers",
    description: "Effortlessly chic wide-leg trousers that offer both comfort and style. Made from a flowy, lightweight material.",
    price: 4299,
    category: "Women",
    subCategory: "Bottomwear",
    bestseller: true,
    sizes: ["S", "M", "L"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1594611545628-3b9518a2879f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d2lkZSUyMGxlZyUyMHRyb3VzZXJzfGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1529391409740-59f2618d3d52?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8d2lkZSUyMGxlZyUyMHRyb3VzZXJzfGVufDB8fDB8fHww"
    ]
  },

  // Women's Dresses (3)
  {
    name: "Women's Floral Maxi Dress",
    description: "An elegant floral maxi dress with a flowing silhouette, perfect for summer occasions and beach vacations.",
    price: 5999,
    category: "Women",
    subCategory: "Dresses",
    bestseller: false,
    sizes: ["S", "M", "L"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1572804013427-4d7ca7268211?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZHJlc3N8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGRyZXNzfGVufDB8fDB8fHww"
    ]
  },
  {
    name: "Women's Little Black Dress",
    description: "A stunning and form-fitting bodycon dress for a night out. The quintessential little black dress.",
    price: 4999,
    category: "Women",
    subCategory: "Dresses",
    bestseller: true,
    sizes: ["XS", "S", "M"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1595777457587-43798a6f3152?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YmxhY2slMjBkcmVzc3xlbnwwfHwwfHx8MA%3D%3D",
      "https://images.unsplash.com/photo-1597096051989-3d4c38210e74?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YmxhY2slMjBkcmVzc3xlbnwwfHwwfHx8MA%3D%3D"
    ]
  },
  {
    name: "Women's Stylish Jumpsuit",
    description: "A stylish and comfortable one-piece jumpsuit perfect for any occasion, from casual outings to evening events.",
    price: 5499,
    category: "Women",
    subCategory: "Dresses",
    bestseller: false,
    sizes: ["S", "M", "L"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1574695333990-5a34a8e35a11?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8anVtcHN1aXR8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1596958414436-3b89b88496ce?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8anVtcHN1aXR8ZW58MHx8MHx8fDA%3D"
    ]
  },

  // Women's Jackets (2)
  {
    name: "Women's Classic Trench Coat",
    description: "A sophisticated and timeless double-breasted trench coat for a polished look. Water-resistant fabric.",
    price: 8999,
    category: "Women",
    subCategory: "Jackets",
    bestseller: true,
    sizes: ["S", "M", "L"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1616852367931-a83d472a74d9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dHJlbmNoJTIwY29hdHxlbnwwfHwwfHx8MA%3D%3D",
      "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dHJlbmNoJTIwY29hdHxlbnwwfHwwfHx8MA%3D%3D"
    ]
  },
  {
    name: "Women's Cropped Denim Jacket",
    description: "A modern cropped denim jacket perfect for layering over dresses or tops. A trendy twist on a classic.",
    price: 4799,
    category: "Women",
    subCategory: "Jackets",
    bestseller: false,
    sizes: ["XS", "S", "M"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1606760227091-3ddc9f2852b4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y3JvcHBlZCUyMGRlbmltJTIwamFja2V0fGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1595950653106-6c986e588e2f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8c25lYWtlcnN8ZW58MHx8MHx8fDA%3D"
    ]
  },

  // Unisex (5)
  {
    name: "Unisex Oversized Hoodie",
    description: "A cozy and stylish oversized hoodie made from a premium fleece blend. Perfect for a relaxed, comfortable fit.",
    price: 4999,
    category: "Unisex",
    subCategory: "Topwear",
    bestseller: false,
    sizes: ["M", "L", "XL", "XXL"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aG9vZGllfGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3dlYXRzaGlydHxlbnwwfHwwfHx8MA%3D%3D"
    ]
  },
  {
    name: "Unisex Classic Beanie",
    description: "A soft, warm, and stylish ribbed beanie hat perfect for cold weather. Made from 100% acrylic yarn.",
    price: 999,
    category: "Unisex",
    subCategory: "Accessories",
    bestseller: false,
    sizes: ["One Size"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1575428652377-a3d80e281498?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmVhbmllfGVufDB8fDB8fHww",
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmVhbmllfGVufDB8fDB8fHww"
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
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c25lYWtlcnN8ZW58MHx8MHx8fDA%3D",
      "https://images.unsplash.com/photo-1595950653106-6c986e588e2f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8c25lYWtlcnN8ZW58MHx8MHx8fDA%3D"
    ]
  },
  {
    name: "Unisex Canvas Tote Bag",
    description: "A durable and spacious canvas tote bag for everyday use. Features an internal pocket for small items.",
    price: 1599,
    category: "Unisex",
    subCategory: "Accessories",
    bestseller: false,
    sizes: ["One Size"],
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1544813545-169b433b7d76?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dG90ZSUyMGJhZ3xlbnwwfHwwfHx8MA%3D%3D",
      "https://images.unsplash.com/photo-1572196289918-f8a84a3234a2?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8dG90ZSUyMGJhZ3xlbnwwfHwwfHx8MA%3D%3D"
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
    stock: 100,
    image: [
      "https://images.unsplash.com/photo-1577803645773-f92475de7001?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3VuZ2xhc3Nlc3xlbnwwfHwwfHx8MA%3D%3D",
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8c3VuZ2xhc3Nlc3xlbnwwfHwwfHx8MA%3D%3D"
    ]
  },
];

async function main() {
  console.log('Start seeding...');

  // Optional: Clean the database before seeding
  await prisma.product.deleteMany();
  console.log('Deleted all records in the product table.');

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
        image: p.image, // Ensure your schema has `image String[]`
        stock: p.stock,
        // The date will be set to the time of seeding
        date: BigInt(Date.now()), 
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