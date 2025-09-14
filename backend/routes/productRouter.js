const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const authenticateToken = require('../middleware/authenticateToken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Хранилище для загрузки фото товара
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/products');
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '_' + file.originalname;
        cb(null, uniqueSuffix);
    },
});

const upload = multer({ storage });

// ---------- ПУБЛИЧНЫЕ РОУТЫ (чтение) ----------
router.get('/', ProductController.findAll);
router.get('/service-center/:serviceCenterId', ProductController.findByServiceCenter);
router.get('/:id', ProductController.findOne);

// ---------- ЗАЩИЩЁННЫЕ РОУТЫ (модификация) ----------
router.post('/', authenticateToken, upload.single('photo'), ProductController.create);
router.put('/:id', authenticateToken, upload.single('photo'), ProductController.update);
router.delete('/:id', authenticateToken, ProductController.delete);

module.exports = router;
