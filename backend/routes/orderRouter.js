const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const authenticateToken = require('../middleware/authenticateToken');

// Все операции с заказами требуют авторизации
router.use(authenticateToken);

// Создать заказ
router.post('/', OrderController.createOrder);

// Заказы текущего пользователя
router.get('/', OrderController.getUserOrders);

// Заказы сервисного центра (по токену сервис-центра)
router.get('/serviceCenterOrders', OrderController.getServiceCenterOrders);
// Алиас для старого пути
router.get('/sellerOrders', OrderController.getServiceCenterOrders);

// Обновить дополнительные детали (например, способ доставки)
router.put('/:id/details', OrderController.updateOrderDetails);

// Получить заказ по id
router.get('/:id', OrderController.getOrderById);

// Обновить статус заказа
router.put('/:id/status', OrderController.updateOrderStatus);

// Удалить заказ
router.delete('/:id', OrderController.deleteOrder);

module.exports = router;
