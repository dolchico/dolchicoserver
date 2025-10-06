import { uploadBuffer } from '../services/cloudinary.service.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // Dynamic folder based on query param (e.g., ?type=subcategory)
    const type = req.query.type || 'products';
    const folder = type === 'subcategory' ? 'subcategories' : 'products';

    // Upload to Cloudinary and get full URL
    const imageUrl = await uploadBuffer(req.file.buffer, { 
      folder,
      resource_type: 'image'
    });

    res.status(200).json({
      success: true,
      imageUrl: imageUrl, // Full Cloudinary URL
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
};