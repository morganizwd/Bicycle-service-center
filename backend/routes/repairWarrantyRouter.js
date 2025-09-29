const express = require('express');
const RepairWarrantyController = require('../controllers/repairWarrantyController');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

router.get('/', RepairWarrantyController.findAll);
router.get('/:id', RepairWarrantyController.findOne);
router.post('/', authenticateToken, RepairWarrantyController.create);
router.put('/:id', authenticateToken, RepairWarrantyController.update);
router.delete('/:id', authenticateToken, RepairWarrantyController.delete);

module.exports = router;
