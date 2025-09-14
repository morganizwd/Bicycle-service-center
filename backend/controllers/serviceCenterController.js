//backend\controllers\serviceCenterController.js
const { ServiceCenter, Product, Review, User, sequelize } = require('../models/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { Op } = require('sequelize');

function sanitize(entity) {
    if (!entity) return null;
    const plain = entity.get ? entity.get({ plain: true }) : entity;
    if (plain && plain.password) delete plain.password;
    return plain;
}

async function ensureDir(dir) {
    await fsp.mkdir(dir, { recursive: true });
}

async function saveUploadedFile(dir, filename, file) {
    await ensureDir(dir);
    const fullPath = path.join(dir, filename);
    if (file?.buffer) {
        await fsp.writeFile(fullPath, file.buffer);
    } else if (file?.path) {
        const data = await fsp.readFile(file.path);
        await fsp.writeFile(fullPath, data);
    }
    return fullPath;
}

class ServiceCenterController {
    /* Регистрация сервисного центра */
    async registration(req, res) {
        try {
            // ВРЕМЕННЫЙ лог, чтобы увидеть что реально приходит от клиента
            console.log('REG BODY:', req.body, 'FILE:', !!req.file);

            // Все поля из multipart приходят строками. Сразу trim.
            const pick = (v) => (typeof v === 'string' ? v.trim() : v);
            const {
                name, contactPerson, registrationNumber, phone,
                email, password, address,
                establishedYear, specialization, offersDelivery
            } = Object.fromEntries(Object.entries(req.body).map(([k, v]) => [k, pick(v)]));

            // Валидация обязательных полей (после trim)
            const required = { name, contactPerson, registrationNumber, phone, email, password, address, specialization };
            const missing = Object.entries(required).filter(([, v]) => !v);
            if (missing.length) {
                return res.status(400).json({ message: `Заполнены не все обязательные поля: ${missing.map(([k]) => k).join(', ')}` });
            }

            const normalizedEmail = String(email).toLowerCase();
            const existing = await ServiceCenter.findOne({ where: { email: normalizedEmail } });
            if (existing) {
                return res.status(400).json({ message: 'Сервисный центр с таким email уже существует' });
            }

            const passwordHash = await bcrypt.hash(password, 12);

            let logo = null;
            if (req.file) {
                const uploadDir = path.join(__dirname, '../uploads/servicecenters');
                const filename = `${Date.now()}_${req.file.originalname}`;
                await saveUploadedFile(uploadDir, filename, req.file);
                logo = `/uploads/servicecenters/${filename}`;
            }

            const center = await ServiceCenter.create({
                name,
                contactPerson,
                registrationNumber,
                phone,
                email: normalizedEmail,
                password: passwordHash,
                address,
                establishedYear: establishedYear ? parseInt(establishedYear, 10) : null,
                specialization, // ENUM — если значение не из списка, Sequelize сам бросит ошибку
                offersDelivery: offersDelivery === 'true' || offersDelivery === true,
                logo
            });

            return res.status(201).json(sanitize(center));
        } catch (error) {
            console.error('Ошибка при регистрации сервисного центра:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Вход сервисного центра */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const normalizedEmail = String(email || '').trim().toLowerCase();

            const center = await ServiceCenter.findOne({ where: { email: normalizedEmail } });
            if (!center) return res.status(404).json({ message: 'Сервисный центр не найден' });

            const ok = await bcrypt.compare(password || '', center.password);
            if (!ok) return res.status(400).json({ message: 'Неверный пароль' });

            const token = jwt.sign(
                { serviceCenterId: center.id },
                process.env.JWT_SECRET || 'your_jwt_secret_key',
                { expiresIn: '24h' }
            );

            return res.json({ token, serviceCenter: sanitize(center) });
        } catch (error) {
            console.error('Ошибка при входе сервисного центра:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Проверка токена */
    async auth(req, res) {
        try {
            const id = req.user?.serviceCenterId;
            if (!id) return res.status(401).json({ message: 'Не авторизован' });

            const center = await ServiceCenter.findByPk(id);
            if (!center) return res.status(401).json({ message: 'Токен недействителен' });

            return res.json(sanitize(center));
        } catch (error) {
            console.error('Ошибка при аутентификации сервисного центра:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Получить один сервисный центр */
    async findOne(req, res) {
        try {
            const { id } = req.params;
            const center = await ServiceCenter.findByPk(id, {
                attributes: { exclude: ['password'] },
                include: [
                    { model: Product },
                    {
                        model: Review,
                        include: [{ model: User, attributes: ['firstName', 'lastName'] }]
                    },
                ],
            });

            if (!center) return res.status(404).json({ message: 'Сервисный центр не найден' });
            return res.json(center);
        } catch (error) {
            console.error('Ошибка при получении сервисного центра:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Список сервисных центров с агрегацией рейтинга и фильтрами */
    async findAll(req, res) {
        try {
            const { name, address, averageRating, limit, offset } = req.query;

            const where = {};
            if (name) where.name = { [Op.iLike]: `%${name}%` };
            if (address) where.address = { [Op.iLike]: `%${address}%` };

            let having = null;
            if (averageRating) {
                having = sequelize.where(
                    sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('Reviews.rating')), 1),
                    { [Op.gte]: parseFloat(averageRating) }
                );
            }

            const { rows, count } = await ServiceCenter.findAndCountAll({
                where,
                include: [
                    {
                        model: Review,
                        attributes: [],
                    },
                ],
                attributes: {
                    include: [
                        [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('Reviews.rating')), 1), 'averageRating'],
                        [sequelize.fn('COUNT', sequelize.col('Reviews.id')), 'reviewCount'],
                    ],
                    exclude: ['password'],
                },
                group: ['ServiceCenter.id'],
                having,
                order: [['name', 'ASC']],
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined,
                subQuery: false,
            });

            return res.json({
                serviceCenters: rows,
                total: Array.isArray(count) ? count.length : count,
            });
        } catch (error) {
            console.error('Ошибка при получении списка сервисных центров:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Обновление сервисного центра */
    async update(req, res) {
        try {
            const {
                name,
                contactPerson,
                registrationNumber,
                phone,
                email,
                password,
                address,
                establishedYear,
                specialization,
                offersDelivery
            } = req.body;
            const id = req.params.id;

            const center = await ServiceCenter.findByPk(id);
            if (!center) return res.status(404).json({ message: 'Сервисный центр не найден' });

            const updated = {
                name,
                contactPerson,
                registrationNumber,
                phone,
                address,
                establishedYear: establishedYear ? parseInt(establishedYear) : center.establishedYear,
                specialization,
                offersDelivery: (offersDelivery === 'true' || offersDelivery === true)
            };

            // смена email с проверкой уникальности
            if (typeof email === 'string') {
                const normalized = email.trim().toLowerCase();
                if (normalized !== center.email) {
                    const exists = await ServiceCenter.findOne({ where: { email: normalized } });
                    if (exists) return res.status(400).json({ message: 'Этот email уже используется другим сервисным центром' });
                    updated.email = normalized;
                }
            }

            if (password) {
                updated.password = await bcrypt.hash(password, 12);
            }

            if (req.file) {
                const uploadDir = path.join(__dirname, '../uploads/servicecenters');
                const filename = `${id}_${req.file.originalname}`;
                await saveUploadedFile(uploadDir, filename, req.file);
                updated.logo = `/uploads/servicecenters/${filename}`;
            }

            await center.update(updated);
            return res.json(sanitize(center));
        } catch (error) {
            console.error('Ошибка при обновлении сервисного центра:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Удаление сервисного центра */
    async delete(req, res) {
        try {
            const center = await ServiceCenter.findByPk(req.params.id);
            if (!center) return res.status(404).json({ message: 'Сервисный центр не найден' });

            await center.destroy();
            return res.status(200).json({ message: 'Сервисный центр успешно удалён' });
        } catch (error) {
            console.error('Ошибка при удалении сервисного центра:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new ServiceCenterController();
