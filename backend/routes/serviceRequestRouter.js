const express = require('express');
const router = express.Router();
const ServiceRequestController = require('../controllers/serviceRequestController');
const authenticateToken = require('../middleware/authenticateToken');

// Создание заявки (пользователь должен быть авторизован)
router.post('/', authenticateToken, ServiceRequestController.createServiceRequest);

// Получение заявки по ID
router.get('/:id', ServiceRequestController.getServiceRequestById);

// Получение списка заявок (фильтры: userId, serviceCenterId, status)
router.get('/', ServiceRequestController.getAllServiceRequests);

// Обновление заявки (владелец заявки или сервисный центр)
router.put('/:id', authenticateToken, ServiceRequestController.updateServiceRequest);

// Удаление заявки (владелец заявки или сервисный центр)
router.delete('/:id', authenticateToken, ServiceRequestController.deleteServiceRequest);

module.exports = router;
