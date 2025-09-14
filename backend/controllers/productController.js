const { Product, ServiceCenter } = require('../models/models');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { Op } = require('sequelize');

async function ensureDir(dir) {
    await fsp.mkdir(dir, { recursive: true });
}

function pickFirstFile(req, field) {
    // поддерживаем req.file и req.files[field]
    if (req.file && (!field || field === 'photo')) return req.file;
    if (req.files && req.files[field] && req.files[field][0]) return req.files[field][0];
    return null;
}

async function saveUploadedFile(baseDir, filename, file) {
    await ensureDir(baseDir);
    const fullPath = path.join(baseDir, filename);
    if (file.buffer) {
        await fsp.writeFile(fullPath, file.buffer);
    } else if (file.path) {
        const data = await fsp.readFile(file.path);
        await fsp.writeFile(fullPath, data);
    }
    return fullPath;
}

class ProductController {
    /* Создать продукт (запчасть/аксессуар/велосипед) */
    async create(req, res) {
        try {
            const {
                name,
                description,
                price,
                category,
                brand,
                model,
                condition, // 'new' | 'used'
                warranty,
                stock
            } = req.body;

            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(403).json({ message: 'Нет прав для создания товара' });
            }

            const center = await ServiceCenter.findByPk(serviceCenterId);
            if (!center) return res.status(404).json({ message: 'Сервисный центр не найден' });

            // фото (опционально)
            let photoPath = null;
            const photoFile = pickFirstFile(req, 'photo');
            if (photoFile) {
                const uploadDir = path.join(__dirname, '../uploads/products');
                const filename = `${Date.now()}_${photoFile.originalname}`;
                await saveUploadedFile(uploadDir, filename, photoFile);
                photoPath = `/uploads/products/${filename}`;
            }

            const product = await Product.create({
                name,
                description,
                price,
                category,
                brand,
                model,
                condition,   // если не передать — в модели есть defaultValue: 'new'
                warranty,
                stock,
                serviceCenterId,
                photo: photoPath
            });

            return res.status(201).json(product);
        } catch (error) {
            console.error('Ошибка при создании продукта:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Один продукт */
    async findOne(req, res) {
        try {
            const product = await Product.findByPk(req.params.id, {
                include: [{ model: ServiceCenter }]
            });
            if (!product) return res.status(404).json({ message: 'Продукт не найден' });
            return res.json(product);
        } catch (error) {
            console.error('Ошибка при получении продукта:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Список продуктов (+ простые фильтры по запросу) */
    async findAll(req, res) {
        try {
            const {
                q, // поиск по имени/описанию
                category,
                brand,
                minPrice,
                maxPrice,
                inStock, // 'true' | 'false'
                serviceCenterId,
                limit,
                offset
            } = req.query;

            const where = {};
            if (q) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${q}%` } },
                    { description: { [Op.iLike]: `%${q}%` } }
                ];
            }
            if (category) where.category = { [Op.iLike]: `%${category}%` };
            if (brand) where.brand = { [Op.iLike]: `%${brand}%` };
            if (minPrice || maxPrice) {
                where.price = {};
                if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
                if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
            }
            if (inStock === 'true') where.stock = { [Op.gt]: 0 };
            if (serviceCenterId) where.serviceCenterId = parseInt(serviceCenterId);

            const products = await Product.findAll({
                where,
                include: [{ model: ServiceCenter }],
                order: [['name', 'ASC']],
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined
            });

            return res.json(products);
        } catch (error) {
            console.error('Ошибка при получении списка продуктов:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Обновить продукт (только владелец сервис-центра) */
    async update(req, res) {
        try {
            const productId = req.params.id;
            const {
                name,
                description,
                price,
                category,
                brand,
                model,
                condition,
                warranty,
                stock
            } = req.body;

            const product = await Product.findByPk(productId);
            if (!product) return res.status(404).json({ message: 'Продукт не найден' });

            const requesterCenterId = req.user?.serviceCenterId;
            if (!requesterCenterId || requesterCenterId !== product.serviceCenterId) {
                return res.status(403).json({ message: 'Нет прав для обновления этого товара' });
            }

            const updatedData = {
                name,
                description,
                price,
                category,
                brand,
                model,
                condition,
                warranty,
                stock
            };

            // новое фото (опционально)
            const photoFile = pickFirstFile(req, 'photo');
            if (photoFile) {
                const uploadDir = path.join(__dirname, '../uploads/products');
                const filename = `${productId}_${photoFile.originalname}`;
                await saveUploadedFile(uploadDir, filename, photoFile);
                updatedData.photo = `/uploads/products/${filename}`;
            }

            await product.update(updatedData);
            return res.json(product);
        } catch (error) {
            console.error('Ошибка при обновлении продукта:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Удалить продукт (только владелец сервис-центра) */
    async delete(req, res) {
        try {
            const product = await Product.findByPk(req.params.id);
            if (!product) return res.status(404).json({ message: 'Продукт не найден' });

            const requesterCenterId = req.user?.serviceCenterId;
            if (!requesterCenterId || requesterCenterId !== product.serviceCenterId) {
                return res.status(403).json({ message: 'Нет прав для удаления этого товара' });
            }

            await product.destroy();
            return res.status(200).json({ message: 'Продукт успешно удалён' });
        } catch (error) {
            console.error('Ошибка при удалении продукта:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    /* Продукты конкретного сервисного центра */
    async findByServiceCenter(req, res) {
        try {
            const { serviceCenterId } = req.params;

            const center = await ServiceCenter.findByPk(serviceCenterId);
            if (!center) return res.status(404).json({ message: 'Сервисный центр не найден' });

            const products = await Product.findAll({ where: { serviceCenterId } });
            return res.json(products);
        } catch (error) {
            console.error('Ошибка при получении товаров сервисного центра:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new ProductController();
