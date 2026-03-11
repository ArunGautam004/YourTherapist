import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { protect } from '../middleware/auth.js';

const router = express.Router();

let cloudinaryConfigured = false;
const configureCloudinary = () => {
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    cloudinaryConfigured = true;
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// @desc    Upload image
// @route   POST /api/upload
router.post('/', protect, upload.single('image'), async (req, res, next) => {
  try {
    configureCloudinary();
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'yourtherapist_profiles',
      resource_type: 'auto'
    });

    res.status(200).json({
      success: true,
      url: result.secure_url
    });
  } catch (error) {
    next(error);
  }
});

export default router;