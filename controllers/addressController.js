import * as addressService from '../services/addressService.js';

// Controller to get all addresses for the logged-in user
export const getAllAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await addressService.getAddressesByUserId(userId);
    res.status(200).json({ success: true, addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve addresses.', error: error.message });
  }
};

// Controller to add a new address
export const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressData = req.body;

    // Basic validation
    if (!addressData.name || !addressData.street || !addressData.city || !addressData.phone) {
        return res.status(400).json({ success: false, message: 'Required address fields are missing.' });
    }

    const newAddress = await addressService.createAddress(userId, addressData);
    res.status(201).json({ success: true, message: 'Address added successfully.', address: newAddress });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add address.', error: error.message });
  }
};

// Controller to update an existing address
export const editAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.id, 10);
    const updateData = req.body;

    // 1. Check if the address exists and if the user owns it
    const address = await addressService.findAddressById(addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }
    if (address.userId !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this address.' });
    }

    // 2. Perform the update
    const updatedAddress = await addressService.updateAddress(addressId, updateData);
    res.status(200).json({ success: true, message: 'Address updated successfully.', address: updatedAddress });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update address.', error: error.message });
  }
};

// Controller to delete an address
export const removeAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.id, 10);

    // 1. Check ownership before deleting
    const address = await addressService.findAddressById(addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }
    if (address.userId !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this address.' });
    }

    // 2. Perform the deletion
    await addressService.deleteAddress(addressId);
    res.status(200).json({ success: true, message: 'Address removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove address.', error: error.message });
  }
};

// Controller to set an address as default
export const setDefaultAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = parseInt(req.params.id, 10);

        // 1. Check ownership before setting as default
        const address = await addressService.findAddressById(addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }
        if (address.userId !== userId) {
            return res.status(403).json({ success: false, message: 'You are not authorized to modify this address.' });
        }
        
        // 2. Perform the action
        const newDefaultAddress = await addressService.setAddressAsDefault(userId, addressId);
        res.status(200).json({ success: true, message: 'Default address updated.', address: newDefaultAddress });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to set default address.', error: error.message });
    }
};