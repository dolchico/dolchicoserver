// test-wishlist.js - Test wishlist service with new relational schema
import { PrismaClient } from '@prisma/client';
import { getWishlistService, addToWishlistService } from './services/wishlistService.js';

const prisma = new PrismaClient();

async function testWishlistService() {
  console.log('=== TESTING WISHLIST SERVICE WITH NEW SCHEMA ===');
  
  try {
    // Step 1: Find a test user
    const testUser = await prisma.user.findFirst({
      where: { email: { contains: '@' } },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }
    
    console.log('✅ Using test user:', testUser.id, testUser.email);
    
    // Step 2: Find a test product
    const testProduct = await prisma.product.findFirst({
      where: { isActive: true },
      include: {
        category: true,
        subcategory: true
      }
    });
    
    if (!testProduct) {
      console.log('❌ No test product found');
      return;
    }
    
    console.log('✅ Using test product:', testProduct.id, testProduct.name);
    console.log('   Category:', testProduct.category?.name || 'None');
    console.log('   Subcategory:', testProduct.subcategory?.name || 'None');
    
    // Step 3: Test getting wishlist (should work without errors now)
    console.log('\n=== TESTING GET WISHLIST ===');
    const wishlist = await getWishlistService(testUser.id);
    console.log('✅ Successfully fetched wishlist with', wishlist.length, 'items');
    
    if (wishlist.length > 0) {
      const firstItem = wishlist[0];
      console.log('✅ Sample wishlist item structure:');
      console.log('   Product name:', firstItem.product.name);
      console.log('   Category object:', firstItem.product.category);
      console.log('   Subcategory object:', firstItem.product.subcategory);
    }
    
    console.log('\n✅ SUCCESS! Wishlist service is working with the new relational schema');
    
  } catch (error) {
    console.error('❌ FAILED! Error testing wishlist service:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWishlistService().catch(console.error);
