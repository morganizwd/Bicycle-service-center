const express = require('express');
const ServiceCenterController = require('../controllers/serviceCenterController');
const OrderController = require('../controllers/orderController');
const authenticateToken = require('../middleware/authenticateToken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/servicecenters');
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '_' + file.originalname;
        cb(null, uniqueSuffix);
    },
});

const upload = multer({ storage });

const router = express.Router();

// Заказы сервисного центра (по токену сервис-центра)
router.get('/orders', authenticateToken, OrderController.getServiceCenterOrders);

// Аутентификация сервис-центра
router.post('/registration', upload.single('logo'), ServiceCenterController.registration);
router.post('/login', ServiceCenterController.login);
router.get('/auth', authenticateToken, ServiceCenterController.auth);

// CRUD сервис-центров
router.get('/', ServiceCenterController.findAll);
router.get('/:id', ServiceCenterController.findOne);
router.put('/:id', authenticateToken, upload.single('logo'), ServiceCenterController.update);
router.delete('/:id', authenticateToken, ServiceCenterController.delete);

module.exports = router;
