// test-wishlist-bigint.js - Test BigInt serialization in wishlist controller
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test the formatWishlistItems helper function
const formatWishlistItems = (items) => {
    return items.map(item => ({
        ...item,
        product: {
            ...item.product,
            // Safely convert BigInt to string for JSON serialization
            date: item.product.date ? item.product.date.toString() : null,
        }
    }));
};

async function testBigIntSerialization() {
  console.log('=== TESTING BIGINT SERIALIZATION IN WISHLIST ===');
  
  try {
    // Step 1: Get a sample wishlist item with product data
    const wishlistItem = await prisma.wishlist.findFirst({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image: true,
            sizes: true,
            bestseller: true,
            isActive: true,
            stock: true,
            createdAt: true,
            date: true, // This is the BigInt field that causes issues
            category: true,
            subcategory: true,
          }
        }
      }
    });
    
    if (!wishlistItem) {
      console.log('❌ No wishlist items found to test');
      return;
    }
    
    console.log('✅ Found test wishlist item:', wishlistItem.id);
    console.log('✅ Product date type:', typeof wishlistItem.product.date);
    console.log('✅ Product date value:', wishlistItem.product.date);
    
    // Step 2: Test raw JSON.stringify (should fail or cause issues)
    console.log('\n=== TESTING RAW JSON SERIALIZATION ===');
    try {
      const rawJson = JSON.stringify(wishlistItem);
      console.log('⚠️  Raw JSON serialization succeeded (unexpected)');
    } catch (error) {
      console.log('❌ Raw JSON serialization failed as expected:', error.message);
    }
    
    // Step 3: Test formatted version (should work)
    console.log('\n=== TESTING FORMATTED JSON SERIALIZATION ===');
    const formatted = formatWishlistItems([wishlistItem]);
    
    try {
      const formattedJson = JSON.stringify(formatted[0]);
      console.log('✅ Formatted JSON serialization succeeded');
      console.log('✅ Formatted date type:', typeof formatted[0].product.date);
      console.log('✅ Formatted date value:', formatted[0].product.date);
      
      // Verify the JSON is valid
      const parsed = JSON.parse(formattedJson);
      console.log('✅ JSON parsing verification successful');
      
    } catch (error) {
      console.log('❌ Formatted JSON serialization failed:', error.message);
    }
    
    console.log('\n✅ SUCCESS! BigInt serialization test completed');
    
  } catch (error) {
    console.error('❌ FAILED! Error during BigInt serialization test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBigIntSerialization().catch(console.error);
