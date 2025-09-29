const express = require('express');
const WorkshopServiceController = require('../controllers/workshopServiceController');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

router.get('/', WorkshopServiceController.findAll);
router.get('/:id', WorkshopServiceController.findOne);
router.post('/', authenticateToken, WorkshopServiceController.create);
router.put('/:id', authenticateToken, WorkshopServiceController.update);
router.delete('/:id', authenticateToken, WorkshopServiceController.delete);

module.exports = router;
