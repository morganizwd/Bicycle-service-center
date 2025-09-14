const Router = require('express').Router;
const CartController = require('../controllers/cartController');
const authenticateToken = require('../middleware/authenticateToken');

const router = Router();

// Все маршруты корзины требуют авторизации
router.use(authenticateToken);

router.get('/', CartController.getBasket);
router.post('/add', CartController.addItem);
router.delete('/remove/:productId', CartController.removeItem);
router.put('/update/:productId', CartController.updateItemQuantity);
router.delete('/clear', CartController.clearCart);

module.exports = router;
