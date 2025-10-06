import multer from 'multer';

const storage = multer.memoryStorage(); // Store in memory for Cloudinary

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) return cb(null, true);
    cb(new Error('Only image files allowed'));
  }
});

export default upload;