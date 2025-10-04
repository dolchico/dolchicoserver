import * as addressService from '../services/addressService.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { validate } from 'uuid'; // For userId validation

// Helper function to validate inputs
const validateAddressData = (addressData) => {
  const { name, street, city, phone, state, zip, country } = addressData;
  if (!name || typeof name !== 'string' || name.length < 2 || name.length > 100) {
    throw new BadRequestError('Name is required and must be a string between 2 and 100 characters.');
  }
  if (!street || typeof street !== 'string' || street.length < 5 || street.length > 200) {
    throw new BadRequestError('Street is required and must be a string between 5 and 200 characters.');
  }
  if (!city || typeof city !== 'string' || city.length < 2 || city.length > 100) {
    throw new BadRequestError('City is required and must be a string between 2 and 100 characters.');
  }
  if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
    throw new BadRequestError('Phone is required and must be a valid phone number.');
  }
  if (!state || typeof state !== 'string' || state.length < 2 || state.length > 100) {
    throw new BadRequestError('State is required and must be a string between 2 and 100 characters.');
  }
  if (!zip || typeof zip !== 'string' || zip.length < 3 || zip.length > 20) {
    throw new BadRequestError('Zip is required and must be a string between 3 and 20 characters.');
  }
  if (!country || typeof country !== 'string' || country.length < 2 || country.length > 100) {
    throw new BadRequestError('Country is required and must be a string between 2 and 100 characters.');
  }
};

// Helper function to validate addressId as integer
const validateAddressId = (addressId) => {
  const id = parseInt(addressId, 10);
  if (isNaN(id) || id <= 0) {
    throw new BadRequestError('Invalid or missing address ID.');
  }
  return id;
};

// Controller to get all addresses for the logged-in user
export const getAllAddresses = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !validate(userId)) {
      throw new BadRequestError('Invalid or missing user ID.');
    }
    console.log(`[AddressController] Fetching addresses for user: ${userId}`);
    const addresses = await addressService.getAddressesByUserId(userId);
    res.status(200).json({ success: true, addresses });
  } catch (error) {
    console.error(`[AddressController] Error fetching addresses: ${error.message}`);
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to retrieve addresses.', error: error.message });
  }
};

// Controller to add a new address
export const addAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !validate(userId)) {
      throw new BadRequestError('Invalid or missing user ID.');
    }
    const addressData = req.body;
    validateAddressData(addressData);
    console.log(`[AddressController] Adding address for user: ${userId}`);
    const newAddress = await addressService.createAddress(userId, addressData);
    res.status(201).json({ success: true, message: 'Address added successfully.', address: newAddress });
  } catch (error) {
    console.error(`[AddressController] Error adding address: ${error.message}`);
    if (error instanceof BadRequestError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to add address.', error: error.message });
  }
};

// Controller to update an existing address
export const editAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const addressId = validateAddressId(req.params.id); // Validate as integer
    if (!userId || !validate(userId)) {
      throw new BadRequestError('Invalid or missing user ID.');
    }
    const updateData = req.body;

    // Validate update data (allow partial updates)
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No update data provided.');
    }
    if (updateData.name || updateData.street || updateData.city || updateData.phone || updateData.state || updateData.zip || updateData.country) {
      validateAddressData({
        ...updateData,
        name: updateData.name || '',
        street: updateData.street || '',
        city: updateData.city || '',
        phone: updateData.phone || '',
        state: updateData.state || '',
        zip: updateData.zip || '',
        country: updateData.country || '',
      });
    }

    console.log(`[AddressController] Updating address: ${addressId} for user: ${userId}`);
    const address = await addressService.findAddressById(addressId);
    if (!address) {
      throw new NotFoundError('Address not found.');
    }
    if (address.userId !== userId) {
      throw new UnauthorizedError('You are not authorized to edit this address.');
    }

    const updatedAddress = await addressService.updateAddress(addressId, updateData);
    res.status(200).json({ success: true, message: 'Address updated successfully.', address: updatedAddress });
  } catch (error) {
    console.error(`[AddressController] Error updating address: ${error.message}`);
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to update address.', error: error.message });
  }
};

// Controller to delete an address
export const removeAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const addressId = validateAddressId(req.params.id); // Validate as integer
    if (!userId || !validate(userId)) {
      throw new BadRequestError('Invalid or missing user ID.');
    }

    console.log(`[AddressController] Deleting address: ${addressId} for user: ${userId}`);
    const address = await addressService.findAddressById(addressId);
    if (!address) {
      throw new NotFoundError('Address not found.');
    }
    if (address.userId !== userId) {
      throw new UnauthorizedError('You are not authorized to delete this address.');
    }

    await addressService.deleteAddress(addressId);
    res.status(200).json({ success: true, message: 'Address removed successfully.' });
  } catch (error) {
    console.error(`[AddressController] Error deleting address: ${error.message}`);
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to remove address.', error: error.message });
  }
};

// Controller to set an address as default
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const addressId = validateAddressId(req.params.id); // Validate as integer
    if (!userId || !validate(userId)) {
      throw new BadRequestError('Invalid or missing user ID.');
    }

    console.log(`[AddressController] Setting default address: ${addressId} for user: ${userId}`);
    const address = await addressService.findAddressById(addressId);
    if (!address) {
      throw new NotFoundError('Address not found.');
    }
    if (address.userId !== userId) {
      throw new UnauthorizedError('You are not authorized to modify this address.');
    }

    const newDefaultAddress = await addressService.setAddressAsDefault(userId, addressId);
    res.status(200).json({ success: true, message: 'Default address updated.', address: newDefaultAddress });
  } catch (error) {
    console.error(`[AddressController] Error setting default address: ${error.message}`);
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to set default address.', error: error.message });
  }
};