const express = require('express');
const PriceListController = require('../controllers/priceListController');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

router.get('/', PriceListController.findAll);
router.get('/:id', PriceListController.findOne);
router.post('/', authenticateToken, PriceListController.create);
router.put('/:id', authenticateToken, PriceListController.update);
router.delete('/:id', authenticateToken, PriceListController.delete);

module.exports = router;
