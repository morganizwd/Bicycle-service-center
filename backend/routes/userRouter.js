const Router = require('express').Router;
const UserController = require('../controllers/userController');
const authenticateToken = require('../middleware/authenticateToken');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.post('/registration', upload.single('photo'), UserController.registration);
router.post('/login', UserController.login);
router.get('/auth', authenticateToken, UserController.auth);

router.get('/', authenticateToken, UserController.findAll);
router.get('/:id', authenticateToken, UserController.findOne);
router.put('/:id', authenticateToken, upload.single('photo'), UserController.update);
router.delete('/:id', authenticateToken, UserController.delete);

module.exports = router;
