const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Не авторизован' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');

        console.log('Decoded token:', decoded);

        if (decoded.userId) {
            req.user = { userId: decoded.userId };
        } else if (decoded.equipmentSellerId) {
            req.user = { equipmentSellerId: decoded.equipmentSellerId };
        } else {
            return res.status(401).json({ message: 'Не авторизован' });
        }

        next();
    } catch (e) {
        console.error('Ошибка в authenticateToken middleware:', e);
        res.status(401).json({ message: 'Не авторизован' });
    }
};