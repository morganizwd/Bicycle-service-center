const Router = require('express').Router;
const ReviewController = require('../controllers/reviewController');
const authenticateToken = require('../middleware/authenticateToken');

const router = Router();

// Публичные
router.get('/', ReviewController.getAllReviews);
router.get('/service-center/:serviceCenterId', ReviewController.getReviewsByServiceCenter);
// Алиас для старого пути
router.get('/seller/:sellerId', (req, res, next) => {
    req.params.serviceCenterId = req.params.sellerId;
    return ReviewController.getReviewsByServiceCenter(req, res, next);
});
router.get('/:id', ReviewController.getReviewById);

// Защищённые (нужен токен)
router.post('/', authenticateToken, ReviewController.createReview);
router.put('/:id', authenticateToken, ReviewController.updateReview);
router.delete('/:id', authenticateToken, ReviewController.deleteReview);

module.exports = router;
