const express = require('express');
const ComponentController = require('../controllers/componentController');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

router.get('/', ComponentController.findAll);
router.get('/:id', ComponentController.findOne);
router.post('/', authenticateToken, ComponentController.create);
router.put('/:id', authenticateToken, ComponentController.update);
router.delete('/:id', authenticateToken, ComponentController.delete);

module.exports = router;
