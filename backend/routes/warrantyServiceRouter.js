// routes/warrantyServiceRoutes.js
const express = require('express');
const router = express.Router();
const WarrantyServiceController = require('../controllers/warrantyServiceController');
const authenticateToken = require('../middleware/authenticateToken');

// Создание записи гарантии и сервиса (только авторизованный сервисный центр)
router.post('/', authenticateToken, WarrantyServiceController.createWarrantyService);

// Получение записи гарантии и сервиса по ID
router.get('/:id', WarrantyServiceController.getWarrantyServiceById);

// Получение списка записей гарантии (фильтры: orderItemId, serviceCenterId)
router.get('/', WarrantyServiceController.getAllWarrantyServices);

// Обновление записи гарантии и сервиса (только авторизованный сервисный центр)
router.put('/:id', authenticateToken, WarrantyServiceController.updateWarrantyService);

// Удаление записи гарантии и сервиса (только авторизованный сервисный центр)
router.delete('/:id', authenticateToken, WarrantyServiceController.deleteWarrantyService);

module.exports = router;
