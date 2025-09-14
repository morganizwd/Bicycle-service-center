const { User } = require('../models/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fsp = require('fs').promises;
const path = require('path');

function sanitizeUser(instance) {
    if (!instance) return null;
    const user = instance.get ? instance.get({ plain: true }) : instance;
    if (user && user.password) delete user.password;
    return user;
}

function parseDateOrNull(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.valueOf()) ? 'invalid' : d;
}

class UserController {
    async registration(req, res) {
        try {
            const { firstName, lastName, email, password, phone, birthDate, address } = req.body;

            if (!firstName || !lastName || !email || !password || !phone) {
                return res.status(400).json({
                    message: 'Заполните обязательные поля: firstName, lastName, email, password, phone',
                });
            }

            const normalizedEmail = String(email).trim().toLowerCase();
            const existingUser = await User.findOne({ where: { email: normalizedEmail } });
            if (existingUser) {
                return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
            }

            // валидация даты рождения
            const parsedBirth = parseDateOrNull(birthDate);
            if (parsedBirth === 'invalid') {
                return res.status(400).json({ message: 'Некорректная дата рождения' });
            }

            const passwordHash = await bcrypt.hash(password, 12);

            let photoPath = null;
            if (req.file) {
                const uploadDir = path.join(__dirname, '../uploads/users');
                await fsp.mkdir(uploadDir, { recursive: true });
                const filename = `${Date.now()}_${req.file.originalname}`;
                await fsp.writeFile(path.join(uploadDir, filename), req.file.buffer);
                photoPath = `/uploads/users/${filename}`;
            }

            const user = await User.create({
                firstName,
                lastName,
                email: normalizedEmail,
                password: passwordHash,
                phone,
                birthDate: parsedBirth, // null или Date
                address,
                photo: photoPath,
            });

            return res.status(201).json(sanitizeUser(user));
        } catch (error) {
            console.error('Ошибка при регистрации пользователя:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const normalizedEmail = String(email || '').trim().toLowerCase();

            const user = await User.findOne({ where: { email: normalizedEmail } });
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }

            const isMatch = await bcrypt.compare(password || '', user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Неверный пароль' });
            }

            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET || 'your_jwt_secret_key',
                { expiresIn: '24h' }
            );

            return res.json({ token, user: sanitizeUser(user) });
        } catch (error) {
            console.error('Ошибка при входе пользователя:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // здесь мы уже прошли authenticateToken, берём userId из req.user
    async auth(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ message: 'Не авторизован' });

            const user = await User.findByPk(userId);
            if (!user) return res.status(401).json({ message: 'Токен недействителен' });

            return res.json(sanitizeUser(user));
        } catch (error) {
            console.error('Ошибка при аутентификации пользователя:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async findOne(req, res) {
        try {
            const user = await User.findByPk(req.params.id, {
                attributes: { exclude: ['password'] },
            });
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            return res.json(user);
        } catch (error) {
            console.error('Ошибка при получении пользователя:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async findAll(req, res) {
        try {
            const users = await User.findAll({
                attributes: { exclude: ['password'] },
            });
            return res.json(users);
        } catch (error) {
            console.error('Ошибка при получении списка пользователей:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async update(req, res) {
        try {
            const { firstName, lastName, email, password, phone, birthDate, address } = req.body;
            const userId = req.params.id;

            if (!req.user || req.user.userId !== parseInt(userId, 10)) {
                return res.status(403).json({ message: 'Нет прав для обновления этого профиля' });
            }

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }

            const updatedData = {};
            if (firstName !== undefined) updatedData.firstName = firstName;
            if (lastName !== undefined) updatedData.lastName = lastName;
            if (phone !== undefined) updatedData.phone = phone;
            if (address !== undefined) updatedData.address = address;

            if (birthDate !== undefined) {
                const parsedBirth = parseDateOrNull(birthDate);
                if (parsedBirth === 'invalid') {
                    return res.status(400).json({ message: 'Некорректная дата рождения' });
                }
                updatedData.birthDate = parsedBirth; // может быть null
            }

            // смена email (если передан) + проверка уникальности
            if (typeof email === 'string') {
                const normalizedEmail = email.trim().toLowerCase();
                if (normalizedEmail !== user.email) {
                    const emailExists = await User.findOne({ where: { email: normalizedEmail } });
                    if (emailExists) {
                        return res.status(400).json({ message: 'Этот email уже используется другим пользователем' });
                    }
                    updatedData.email = normalizedEmail;
                }
            }

            if (password) {
                updatedData.password = await bcrypt.hash(password, 12);
            }

            if (req.file) {
                const uploadDir = path.join(__dirname, '../uploads/users');
                await fsp.mkdir(uploadDir, { recursive: true });
                const filename = `${userId}_${req.file.originalname}`;
                await fsp.writeFile(path.join(uploadDir, filename), req.file.buffer);
                updatedData.photo = `/uploads/users/${filename}`;
            }

            await user.update(updatedData);
            return res.json(sanitizeUser(user));
        } catch (error) {
            console.error('Ошибка при обновлении пользователя:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async delete(req, res) {
        try {
            const userId = req.params.id;

            if (!req.user || req.user.userId !== parseInt(userId, 10)) {
                return res.status(403).json({ message: 'Нет прав для удаления этого профиля' });
            }

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }

            await user.destroy();
            return res.status(200).json({ message: 'Пользователь успешно удалён' });
        } catch (error) {
            console.error('Ошибка при удалении пользователя:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new UserController();
