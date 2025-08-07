import multer from "multer";

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

export const upload = multer({ 
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit (adjust as needed)
    },
    fileFilter: function (req, file, cb) {
        // Optional: Add file type validation
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});