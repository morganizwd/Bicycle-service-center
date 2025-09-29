const { WorkshopService, Component, ServiceComponent, sequelize } = require('../models/models');
const { Op } = require('sequelize');

function parseBoolean(value, fallback = undefined) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lowered = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y'].includes(lowered)) return true;
        if (['false', '0', 'no', 'n'].includes(lowered)) return false;
    }
    return fallback;
}

function parseComponentUsages(raw) {
    if (!raw) return [];
    let source = raw;
    if (typeof raw === 'string') {
        try {
            source = JSON.parse(raw);
        } catch (error) {
            throw new Error('componentUsages must be valid JSON');
        }
    }
    if (!Array.isArray(source)) {
        throw new Error('componentUsages must be an array');
    }
    return source.map((entry, index) => {
        const componentId = Number(entry.componentId);
        const quantity = entry.quantity === undefined ? 1 : Number(entry.quantity);
        const unit = entry.unit ? String(entry.unit) : 'pcs';
        if (!Number.isInteger(componentId)) {
            throw new Error(`componentUsages[${index}].componentId is required`);
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error(`componentUsages[${index}].quantity must be a positive number`);
        }
        return { componentId, quantity, unit };
    });
}

function includeComponentsIfNeeded(includeFlag) {
    if (!includeFlag) return [];
    return [
        {
            model: Component,
            as: 'components',
            through: { attributes: ['quantity', 'unit'] },
        },
    ];
}

class WorkshopServiceController {
    async create(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: 'Требуется авторизация сервисного центра' });
            }

            const {
                name,
                description,
                category,
                basePrice,
                durationMinutes,
                isActive,
                componentUsages,
            } = req.body;

            if (!name || !description || basePrice === undefined) {
                return res.status(400).json({
                    message: 'Необходимо передать name, description и basePrice',
                });
            }

            const priceValue = Number(basePrice);
            if (!Number.isFinite(priceValue) || priceValue < 0) {
                return res.status(400).json({ message: 'basePrice должен быть неотрицательным числом' });
            }

            const durationValue = durationMinutes === undefined || durationMinutes === null
                ? null
                : Number(durationMinutes);
            if (durationValue !== null && (!Number.isFinite(durationValue) || durationValue <= 0)) {
                return res.status(400).json({ message: 'durationMinutes должен быть положительным числом' });
            }

            let componentPayload = [];
            try {
                componentPayload = parseComponentUsages(componentUsages);
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }

            const created = await sequelize.transaction(async (transaction) => {
                const workshopService = await WorkshopService.create({
                    serviceCenterId,
                    name: String(name).trim(),
                    description: String(description).trim(),
                    category: category ? String(category).trim() : null,
                    basePrice: priceValue,
                    durationMinutes: durationValue,
                    isActive: parseBoolean(isActive, true),
                }, { transaction });

                if (componentPayload.length) {
                    const componentIds = componentPayload.map((item) => item.componentId);
                    const components = await Component.findAll({
                        where: { id: componentIds, serviceCenterId },
                        transaction,
                    });
                    if (components.length !== componentIds.length) {
                        throw new Error('Не все комплектующие принадлежат текущему сервисному центру');
                    }

                    await ServiceComponent.bulkCreate(
                        componentPayload.map((item) => ({
                            workshopServiceId: workshopService.id,
                            componentId: item.componentId,
                            quantity: item.quantity,
                            unit: item.unit,
                        })),
                        { transaction },
                    );
                }

                return workshopService;
            });

            const withRelations = await WorkshopService.findByPk(created.id, {
                include: includeComponentsIfNeeded(true),
            });

            return res.status(201).json(withRelations);
        } catch (error) {
            console.error('Ошибка при создании услуги мастерской:', error);
            return res.status(500).json({ message: error.message || 'Внутренняя ошибка сервера' });
        }
    }

    async findAll(req, res) {
        try {
            const {
                serviceCenterId,
                category,
                isActive,
                search,
                include,
                includeComponents,
            } = req.query;

            const where = {};
            if (serviceCenterId !== undefined) {
                const scId = Number(serviceCenterId);
                if (!Number.isInteger(scId)) {
                    return res.status(400).json({ message: 'serviceCenterId должен быть целым числом' });
                }
                where.serviceCenterId = scId;
            }
            if (category) {
                where.category = { [Op.iLike]: `%${category.trim()}%` };
            }
            const activeFlag = parseBoolean(isActive, undefined);
            if (activeFlag !== undefined) {
                where.isActive = activeFlag;
            }
            if (search) {
                const pattern = `%${search.trim()}%`;
                where[Op.or] = [
                    { name: { [Op.iLike]: pattern } },
                    { description: { [Op.iLike]: pattern } },
                ];
            }

            const includeFlag = parseBoolean(includeComponents, false) ||
                String(include || '').split(',').map((value) => value.trim().toLowerCase()).includes('components');

            const services = await WorkshopService.findAll({
                where,
                include: includeComponentsIfNeeded(includeFlag),
                order: [['name', 'ASC']],
            });

            return res.json(services);
        } catch (error) {
            console.error('Ошибка при получении списка услуг мастерской:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    }

    async findOne(req, res) {
        try {
            const { id } = req.params;
            const includeFlag = parseBoolean(req.query.includeComponents, true);
            const service = await WorkshopService.findByPk(id, {
                include: includeComponentsIfNeeded(includeFlag),
            });
            if (!service) {
                return res.status(404).json({ message: 'Услуга мастерской не найдена' });
            }
            return res.json(service);
        } catch (error) {
            console.error('Ошибка при получении услуги мастерской:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    }

    async update(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: 'Требуется авторизация сервисного центра' });
            }

            const { id } = req.params;
            const service = await WorkshopService.findByPk(id);
            if (!service) {
                return res.status(404).json({ message: 'Услуга мастерской не найдена' });
            }
            if (service.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: 'Нет доступа к изменению этой услуги' });
            }

            const {
                name,
                description,
                category,
                basePrice,
                durationMinutes,
                isActive,
                componentUsages,
            } = req.body;

            const payload = {};
            if (name !== undefined) payload.name = String(name).trim();
            if (description !== undefined) payload.description = String(description).trim();
            if (category !== undefined) payload.category = category ? String(category).trim() : null;
            if (basePrice !== undefined) {
                const priceValue = Number(basePrice);
                if (!Number.isFinite(priceValue) || priceValue < 0) {
                    return res.status(400).json({ message: 'basePrice должен быть неотрицательным числом' });
                }
                payload.basePrice = priceValue;
            }
            if (durationMinutes !== undefined) {
                if (durationMinutes === null || durationMinutes === '') {
                    payload.durationMinutes = null;
                } else {
                    const durationValue = Number(durationMinutes);
                    if (!Number.isFinite(durationValue) || durationValue <= 0) {
                        return res.status(400).json({ message: 'durationMinutes должен быть положительным числом' });
                    }
                    payload.durationMinutes = durationValue;
                }
            }
            if (isActive !== undefined) {
                payload.isActive = parseBoolean(isActive, service.isActive);
            }

            let componentPayload = null;
            if (componentUsages !== undefined) {
                try {
                    componentPayload = parseComponentUsages(componentUsages);
                } catch (error) {
                    return res.status(400).json({ message: error.message });
                }
            }

            const updatedService = await sequelize.transaction(async (transaction) => {
                await service.update(payload, { transaction });

                if (componentPayload !== null) {
                    await ServiceComponent.destroy({ where: { workshopServiceId: service.id }, transaction });
                    if (componentPayload.length) {
                        const componentIds = componentPayload.map((item) => item.componentId);
                        const components = await Component.findAll({
                            where: { id: componentIds, serviceCenterId },
                            transaction,
                        });
                        if (components.length !== componentIds.length) {
                            throw new Error('Не все комплектующие принадлежат текущему сервисному центру');
                        }

                        await ServiceComponent.bulkCreate(
                            componentPayload.map((item) => ({
                                workshopServiceId: service.id,
                                componentId: item.componentId,
                                quantity: item.quantity,
                                unit: item.unit,
                            })),
                            { transaction },
                        );
                    }
                }

                return service;
            });

            const includeFlag = parseBoolean(req.query.includeComponents, true);
            const withRelations = await WorkshopService.findByPk(updatedService.id, {
                include: includeComponentsIfNeeded(includeFlag),
            });

            return res.json(withRelations);
        } catch (error) {
            console.error('Ошибка при обновлении услуги мастерской:', error);
            const message = error.message || 'Внутренняя ошибка сервера';
            return res.status(500).json({ message });
        }
    }

    async delete(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: 'Требуется авторизация сервисного центра' });
            }

            const { id } = req.params;
            const service = await WorkshopService.findByPk(id);
            if (!service) {
                return res.status(404).json({ message: 'Услуга мастерской не найдена' });
            }
            if (service.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: 'Нет доступа к удалению этой услуги' });
            }

            await sequelize.transaction(async (transaction) => {
                await ServiceComponent.destroy({ where: { workshopServiceId: service.id }, transaction });
                await service.destroy({ transaction });
            });

            return res.json({ message: 'Услуга мастерской удалена' });
        } catch (error) {
            console.error('Ошибка при удалении услуги мастерской:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    }
}

module.exports = new WorkshopServiceController();
