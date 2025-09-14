const Router = require('express').Router;
const router = new Router();

router.use('/users', require('./userRouter'));
router.use('/reviews', require('./reviewRouter'));
router.use('/products', require('./productRouter'));
router.use('/service-centers', require('./serviceCenterRouter'));
router.use('/orders', require('./orderRouter'));
router.use('/carts', require('./cartRouter'));
router.use('/serviceRequests', require('./serviceRequestRouter'));
router.use('/warrantyServices', require('./warrantyServiceRouter'));

module.exports = router;