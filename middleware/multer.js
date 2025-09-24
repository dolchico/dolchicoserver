import multer from 'multer';
// Use memory storage: files will be kept in memory as Buffers and uploaded directly to Cloudinary
const storage = multer.memoryStorage();

// Accept common image mime types only, max 2MB
const fileFilter = (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
        return cb(new Error('Unsupported file type'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter
});

export default upload;