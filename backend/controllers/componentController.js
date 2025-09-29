const { Component, WorkshopService, ServiceComponent } = require('../models/models');
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

function parseStringArray(value) {
    if (value === undefined || value === null || value === '') return null;
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item).trim()).filter(Boolean);
            }
        } catch (error) {
            // fall back to comma separated string
        }
        return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return null;
}

function includeServicesIfRequested(includeServices) {
    if (!includeServices) return [];
    return [
        {
            model: WorkshopService,
            as: 'services',
            through: { attributes: ['quantity', 'unit'] },
        },
    ];
}

class ComponentController {
    async create(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: 'Требуется авторизация сервисного центра' });
            }

            const {
                name,
                description,
                manufacturer,
                supplier,
                partNumber,
                compatibleManufacturers,
                compatibleModels,
                stock,
                unit,
                unitPrice,
                isActive,
            } = req.body;

            if (!name || !manufacturer || unitPrice === undefined) {
                return res.status(400).json({ message: 'Необходимо передать name, manufacturer и unitPrice' });
            }

            const priceValue = Number(unitPrice);
            if (!Number.isFinite(priceValue) || priceValue < 0) {
                return res.status(400).json({ message: 'unitPrice должен быть неотрицательным числом' });
            }

            let stockValue = 0;
            if (stock !== undefined) {
                stockValue = Number(stock);
                if (!Number.isFinite(stockValue) || stockValue < 0) {
                    return res.status(400).json({ message: 'stock должен быть неотрицательным числом' });
                }
                stockValue = Math.round(stockValue);
            }

            const created = await Component.create({
                serviceCenterId,
                name: String(name).trim(),
                description: description ? String(description).trim() : null,
                manufacturer: String(manufacturer).trim(),
                supplier: supplier ? String(supplier).trim() : null,
                partNumber: partNumber ? String(partNumber).trim() : null,
                compatibleManufacturers: parseStringArray(compatibleManufacturers),
                compatibleModels: parseStringArray(compatibleModels),
                stock: stockValue,
                unit: unit ? String(unit).trim() : 'pcs',
                unitPrice: priceValue,
                isActive: parseBoolean(isActive, true),
            });

            return res.status(201).json(created);
        } catch (error) {
            console.error('Ошибка при создании комплектующего:', error);
            return res.status(500).json({ message: error.message || 'Внутренняя ошибка сервера' });
        }
    }

    async findAll(req, res) {
        try {
            const {
                serviceCenterId,
                manufacturer,
                isActive,
                search,
                include,
                includeServices,
                serviceId,
            } = req.query;

            const where = {};
            if (serviceCenterId !== undefined) {
                const scId = Number(serviceCenterId);
                if (!Number.isInteger(scId)) {
                    return res.status(400).json({ message: 'serviceCenterId должен быть целым числом' });
                }
                where.serviceCenterId = scId;
            }
            if (manufacturer) {
                where.manufacturer = { [Op.iLike]: `%${manufacturer.trim()}%` };
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
                    { partNumber: { [Op.iLike]: pattern } },
                ];
            }

            const includeFlag = parseBoolean(includeServices, false) ||
                String(include || '').split(',').map((value) => value.trim().toLowerCase()).includes('services');

            let includeOptions = [];
            if (serviceId !== undefined) {
                const svcId = Number(serviceId);
                if (!Number.isInteger(svcId)) {
                    return res.status(400).json({ message: 'serviceId должен быть целым числом' });
                }
                includeOptions.push({
                    model: WorkshopService,
                    as: 'services',
                    through: { attributes: ['quantity', 'unit'] },
                    where: { id: svcId },
                });
            } else if (includeFlag) {
                includeOptions = includeServicesIfRequested(true);
            }

            const components = await Component.findAll({
                where,
                include: includeOptions,
                order: [['name', 'ASC']],
            });

            return res.json(components);
        } catch (error) {
            console.error('Ошибка при получении комплектующих:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    }

    async findOne(req, res) {
        try {
            const { id } = req.params;
            const includeFlag = parseBoolean(req.query.includeServices, true);
            const component = await Component.findByPk(id, {
                include: includeServicesIfRequested(includeFlag),
            });
            if (!component) {
                return res.status(404).json({ message: 'Комплектующее не найдено' });
            }
            return res.json(component);
        } catch (error) {
            console.error('Ошибка при получении комплектующего:', error);
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
            const component = await Component.findByPk(id);
            if (!component) {
                return res.status(404).json({ message: 'Комплектующее не найдено' });
            }
            if (component.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: 'Нет доступа к изменению этого комплектующего' });
            }

            const {
                name,
                description,
                manufacturer,
                supplier,
                partNumber,
                compatibleManufacturers,
                compatibleModels,
                stock,
                unit,
                unitPrice,
                isActive,
            } = req.body;

            const payload = {};
            if (name !== undefined) payload.name = String(name).trim();
            if (description !== undefined) payload.description = description ? String(description).trim() : null;
            if (manufacturer !== undefined) payload.manufacturer = manufacturer ? String(manufacturer).trim() : null;
            if (supplier !== undefined) payload.supplier = supplier ? String(supplier).trim() : null;
            if (partNumber !== undefined) payload.partNumber = partNumber ? String(partNumber).trim() : null;
            if (compatibleManufacturers !== undefined) payload.compatibleManufacturers = parseStringArray(compatibleManufacturers);
            if (compatibleModels !== undefined) payload.compatibleModels = parseStringArray(compatibleModels);
            if (stock !== undefined) {
                if (stock === null || stock === '') {
                    payload.stock = 0;
                } else {
                    const stockValue = Number(stock);
                    if (!Number.isFinite(stockValue) || stockValue < 0) {
                        return res.status(400).json({ message: 'stock должен быть неотрицательным числом' });
                    }
                    payload.stock = Math.round(stockValue);
                }
            }
            if (unit !== undefined) payload.unit = unit ? String(unit).trim() : 'pcs';
            if (unitPrice !== undefined) {
                const priceValue = Number(unitPrice);
                if (!Number.isFinite(priceValue) || priceValue < 0) {
                    return res.status(400).json({ message: 'unitPrice должен быть неотрицательным числом' });
                }
                payload.unitPrice = priceValue;
            }
            if (isActive !== undefined) payload.isActive = parseBoolean(isActive, component.isActive);

            await component.update(payload);

            const includeFlag = parseBoolean(req.query.includeServices, true);
            const withRelations = await Component.findByPk(component.id, {
                include: includeServicesIfRequested(includeFlag),
            });
            return res.json(withRelations);
        } catch (error) {
            console.error('Ошибка при обновлении комплектующего:', error);
            return res.status(500).json({ message: error.message || 'Внутренняя ошибка сервера' });
        }
    }

    async delete(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: 'Требуется авторизация сервисного центра' });
            }

            const { id } = req.params;
            const component = await Component.findByPk(id);
            if (!component) {
                return res.status(404).json({ message: 'Комплектующее не найдено' });
            }
            if (component.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: 'Нет доступа к удалению этого комплектующего' });
            }

            await ServiceComponent.destroy({ where: { componentId: component.id } });
            await component.destroy();
            return res.json({ message: 'Комплектующее удалено' });
        } catch (error) {
            console.error('Ошибка при удалении комплектующего:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    }
}

module.exports = new ComponentController();

