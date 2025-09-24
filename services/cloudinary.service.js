import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Upload from a local path (kept for backward compatibility)
export const uploadFile = async (filePath, options = {}) => {
  const res = await cloudinary.uploader.upload(filePath, options);
  return res.secure_url;
};

// Upload from a Buffer (for multer memoryStorage)
export const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result.secure_url);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};
