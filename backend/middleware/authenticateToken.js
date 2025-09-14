// middleware/authenticateToken.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const header = req.headers['authorization'] || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Неавторизован' });
    }
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
        // поддерживаем оба варианта
        req.user = {
            userId: payload.userId || null,
            serviceCenterId: payload.serviceCenterId || null,
        };
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Токен недействителен' });
    }
};
