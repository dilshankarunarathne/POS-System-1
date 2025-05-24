const express = require('express');
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/products');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Routes
router.get('/', authenticate, productController.getAllProducts);
router.get('/:id', authenticate, productController.getProductById);
router.post('/', authenticate, authorize('admin', 'manager'), upload.single('image'), productController.createProduct);
router.put('/:id', authenticate, authorize('admin', 'manager'), upload.single('image'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), productController.deleteProduct);
router.get('/barcode/:barcode', authenticate, productController.getProductByBarcode);
router.patch('/:id/stock', authenticate, authorize('admin', 'manager'), productController.updateStock);

module.exports = router; 