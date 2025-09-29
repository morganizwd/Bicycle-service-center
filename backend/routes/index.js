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
router.use('/workshop-services', require('./workshopServiceRouter'));
router.use('/components', require('./componentRouter'));
router.use('/price-lists', require('./priceListRouter'));
router.use('/repair-warranties', require('./repairWarrantyRouter'));

module.exports = router;
