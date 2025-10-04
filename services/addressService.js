import prisma from '../lib/prisma.js';

/**
 * Finds an address by its ID.
 * @param {number} addressId - The ID of the address.
 * @returns {Promise<object|null>} The address object or null if not found.
 */
export const findAddressById = async (addressId) => {
  try {
    // Validate addressId is a positive integer
    const idNum = Number(addressId);
    if (isNaN(idNum) || idNum <= 0) {
      throw new Error('Invalid address ID');
    }

    return await prisma.address.findUnique({
      where: { id: idNum }
    });
  } catch (error) {
    console.error('Error finding address by ID:', error);
    throw error;
  }
};

/**
 * Retrieves all addresses for a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array>} An array of the user's addresses.
 */
export const getAddressesByUserId = async (userId) => {
  try {
    // Validate userId is a non-empty string
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    if (!prisma) {
      throw new Error('Database connection not available');
    }

    return await prisma.address.findMany({
      where: { userId }, // Use string userId
      orderBy: { isDefault: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    throw error;
  }
};

/**
 * Creates a new address for a user.
 * @param {string} userId - The ID of the user.
 * @param {object} addressData - The address data.
 * @returns {Promise<object>} The newly created address object.
 */
export const createAddress = async (userId, addressData) => {
  try {
    // Validate userId is a non-empty string
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    const { name, street, city, state, zip, country, phone, instructions } = addressData;
    return await prisma.address.create({
      data: {
        userId, // Use string userId
        name,
        street,
        city,
        state,
        zip,
        country,
        phone,
        instructions
      }
    });
  } catch (error) {
    console.error('Error creating address:', error);
    throw error;
  }
};

/**
 * Updates an existing address.
 * @param {number} addressId - The ID of the address to update.
 * @param {object} updateData - The data to update.
 * @returns {Promise<object>} The updated address object.
 */
export const updateAddress = async (addressId, updateData) => {
  try {
    // Validate addressId is a positive integer
    const idNum = Number(addressId);
    if (isNaN(idNum) || idNum <= 0) {
      throw new Error('Invalid address ID');
    }

    return await prisma.address.update({
      where: { id: idNum },
      data: updateData
    });
  } catch (error) {
    console.error('Error updating address:', error);
    throw error;
  }
};

/**
 * Deletes an address.
 * @param {number} addressId - The ID of the address to delete.
 * @returns {Promise<object>} The deleted address object.
 */
export const deleteAddress = async (addressId) => {
  try {
    // Validate addressId is a positive integer
    const idNum = Number(addressId);
    if (isNaN(idNum) || idNum <= 0) {
      throw new Error('Invalid address ID');
    }

    return await prisma.address.delete({
      where: { id: idNum }
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
};

/**
 * Sets a specific address as the default for the user.
 * This function uses a transaction to ensure atomicity.
 * @param {string} userId - The ID of the user.
 * @param {number} newDefaultAddressId - The ID of the address to set as default.
 * @returns {Promise<object>} The new default address object.
 */
export const setAddressAsDefault = async (userId, newDefaultAddressId) => {
  try {
    // Validate userId is a non-empty string
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Validate newDefaultAddressId is a positive integer
    const addressIdNum = Number(newDefaultAddressId);
    if (isNaN(addressIdNum) || addressIdNum <= 0) {
      throw new Error('Invalid address ID');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Unset the current default address for the user
      await tx.address.updateMany({
        where: {
          userId, // Use string userId
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });

      // 2. Set the new address as the default
      const newDefaultAddress = await tx.address.update({
        where: {
          id: addressIdNum
        },
        data: {
          isDefault: true
        }
      });

      return newDefaultAddress;
    });
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
};