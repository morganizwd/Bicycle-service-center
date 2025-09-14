const { WarrantyService, OrderItem, Product } = require('../models/models');

class WarrantyServiceController {
    // Создание записи гарантии и сервиса (только сервисный центр — владелец товара)
    async createWarrantyService(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: 'Неавторизованный сервисный центр' });
            }

            const {
                orderItemId,
                warrantyPeriod,
                serviceConditions,
                serviceCenterContacts,
                validUntil
            } = req.body;

            if (!orderItemId || !warrantyPeriod || !serviceConditions || !serviceCenterContacts || !validUntil) {
                return res.status(400).json({ message: 'Заполните все обязательные поля' });
            }

            // Проверяем, что позиция заказа существует и принадлежит товару этого сервисного центра
            const orderItem = await OrderItem.findByPk(orderItemId, {
                include: [{ model: Product }]
            });
            if (!orderItem) {
                return res.status(404).json({ message: 'Элемент заказа не найден' });
            }
            if (orderItem.Product.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: 'Нет прав для оформления гарантии по данному заказу' });
            }

            const warrantyService = await WarrantyService.create({
                orderItemId,
                warrantyPeriod,
                serviceConditions,
                serviceCenterContacts,
                validUntil: new Date(validUntil)
            });

            return res.status(201).json(warrantyService);
        } catch (error) {
            console.error('Ошибка при создании записи гарантии и сервиса:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Получение записи гарантии и сервиса по ID
    async getWarrantyServiceById(req, res) {
        try {
            const { id } = req.params;
            const warrantyService = await WarrantyService.findByPk(id, {
                include: [{
                    model: OrderItem,
                    include: [{ model: Product }]
                }]
            });
            if (!warrantyService) {
                return res.status(404).json({ message: 'Запись гарантии и сервиса не найдена' });
            }
            return res.json(warrantyService);
        } catch (error) {
            console.error('Ошибка при получении записи гарантии и сервиса:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Список записей гарантии и сервиса (+ фильтры)
    async getAllWarrantyServices(req, res) {
        try {
            const { orderItemId, serviceCenterId } = req.query;

            const where = {};
            if (orderItemId) where.orderItemId = parseInt(orderItemId, 10);

            if (serviceCenterId) {
                // находим все orderItem для товаров этого сервисного центра
                const items = await OrderItem.findAll({
                    attributes: ['id'],
                    include: [{ model: Product, where: { serviceCenterId: parseInt(serviceCenterId, 10) } }]
                });
                const ids = items.map(i => i.id);

                if (ids.length === 0) {
                    return res.json([]); // нечего возвращать
                }

                if (where.orderItemId) {
                    // если одновременно передан orderItemId — оставим пересечение
                    if (!ids.includes(where.orderItemId)) {
                        return res.json([]);
                    }
                    // оставляем where.orderItemId как есть
                } else {
                    where.orderItemId = ids; // Sequelize воспримет массив как IN
                }
            }

            const warrantyServices = await WarrantyService.findAll({
                where,
                order: [['createdAt', 'DESC']],
                include: [{
                    model: OrderItem,
                    include: [{ model: Product }]
                }]
            });

            return res.json(warrantyServices);
        } catch (error) {
            console.error('Ошибка при получении записей гарантии и сервиса:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Обновление записи гарантии и сервиса (только владелец сервисного центра)
    async updateWarrantyService(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: 'Неавторизованный сервисный центр' });
            }

            const { id } = req.params;
            const { warrantyPeriod, serviceConditions, serviceCenterContacts, validUntil } = req.body;

            const warrantyService = await WarrantyService.findByPk(id, {
                include: [{
                    model: OrderItem,
                    include: [{ model: Product }]
                }]
            });
            if (!warrantyService) {
                return res.status(404).json({ message: 'Запись гарантии и сервиса не найдена' });
            }

            if (warrantyService.OrderItem.Product.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: 'Нет прав для обновления данной записи' });
            }

            const updatedData = {};
            if (warrantyPeriod !== undefined) updatedData.warrantyPeriod = warrantyPeriod;
            if (serviceConditions !== undefined) updatedData.serviceConditions = serviceConditions;
            if (serviceCenterContacts !== undefined) updatedData.serviceCenterContacts = serviceCenterContacts;
            if (validUntil !== undefined) updatedData.validUntil = new Date(validUntil);

            await warrantyService.update(updatedData);
            return res.json(warrantyService);
        } catch (error) {
            console.error('Ошибка при обновлении записи гарантии и сервиса:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Удаление записи гарантии и сервиса (только владелец сервисного центра)
    async deleteWarrantyService(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: 'Неавторизованный сервисный центр' });
            }

            const { id } = req.params;
            const warrantyService = await WarrantyService.findByPk(id, {
                include: [{
                    model: OrderItem,
                    include: [{ model: Product }]
                }]
            });
            if (!warrantyService) {
                return res.status(404).json({ message: 'Запись гарантии и сервиса не найдена' });
            }

            if (warrantyService.OrderItem.Product.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: 'Нет прав для удаления данной записи' });
            }

            await warrantyService.destroy();
            return res.status(200).json({ message: 'Запись гарантии и сервиса успешно удалена' });
        } catch (error) {
            console.error('Ошибка при удалении записи гарантии и сервиса:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new WarrantyServiceController();
