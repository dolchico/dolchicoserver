import prisma from '../lib/prisma.js';

/**
 * Finds an address by its ID.
 * @param {number} addressId - The ID of the address.
 * @returns {Promise<object|null>} The address object or null if not found.
 */
export const findAddressById = async (addressId) => {
  return prisma.address.findUnique({
    where: { id: addressId },
  });
};

/**
 * Retrieves all addresses for a specific user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array>} An array of the user's addresses.
 */
export const getAddressesByUserId = async (userId) => {
  if (!prisma) {
    throw new Error('Database connection not available');
  }
  
  return prisma.address.findMany({
    where: { userId },
    orderBy: { isDefault: 'desc' },
  });
};


/**
 * Creates a new address for a user.
 * @param {number} userId - The ID of the user.
 * @param {object} addressData - The address data.
 * @returns {Promise<object>} The newly created address object.
 */
export const createAddress = async (userId, addressData) => {
  const { name, street, city, state, zip, country, phone, instructions } = addressData;
  return prisma.address.create({
    data: {
      userId,
      name,
      street,
      city,
      state,
      zip,
      country,
      phone,
      instructions,
    },
  });
};

/**
 * Updates an existing address.
 * @param {number} addressId - The ID of the address to update.
 * @param {object} updateData - The data to update.
 * @returns {Promise<object>} The updated address object.
 */
export const updateAddress = async (addressId, updateData) => {
  return prisma.address.update({
    where: { id: addressId },
    data: updateData,
  });
};

/**
 * Deletes an address.
 * @param {number} addressId - The ID of the address to delete.
 * @returns {Promise<object>} The deleted address object.
 */
export const deleteAddress = async (addressId) => {
  return prisma.address.delete({
    where: { id: addressId },
  });
};

/**
 * Sets a specific address as the default for the user.
 * This function uses a transaction to ensure atomicity.
 * @param {number} userId - The ID of the user.
 * @param {number} newDefaultAddressId - The ID of the address to set as default.
 * @returns {Promise<object>} The new default address object.
 */
export const setAddressAsDefault = async (userId, newDefaultAddressId) => {
  return prisma.$transaction(async (tx) => {
    // 1. Unset the current default address for the user
    await tx.address.updateMany({
      where: {
        userId: userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // 2. Set the new address as the default
    const newDefaultAddress = await tx.address.update({
      where: {
        id: newDefaultAddressId,
      },
      data: {
        isDefault: true,
      },
    });

    return newDefaultAddress;
  });
};