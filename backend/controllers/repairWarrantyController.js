const { RepairWarranty, ServiceRequest, WorkshopService, sequelize } = require('../models/models');
const { Op } = require('sequelize');

const STATUS_VALUES = ['active', 'expired', 'void'];

function parseDate(value, fieldName) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${fieldName} имеет неверный формат даты`);
    }
    return parsed;
}

class RepairWarrantyController {
    async create(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            if (!serviceCenterId) {
                return res.status(401).json({ message: 'Требуется авторизация сервисного центра' });
            }

            const {
                serviceRequestId,
                workshopServiceId,
                coverageDescription,
                warrantyPeriodMonths,
                conditions,
                status = 'active',
                startDate,
                endDate,
            } = req.body;

            if (!serviceRequestId || !coverageDescription || warrantyPeriodMonths === undefined || !startDate || !endDate) {
                return res.status(400).json({
                    message: 'serviceRequestId, coverageDescription, warrantyPeriodMonths, startDate и endDate обязательны',
                });
            }

            const requestId = Number(serviceRequestId);
            if (!Number.isInteger(requestId)) {
                return res.status(400).json({ message: 'serviceRequestId должен быть целым числом' });
            }

            const warrantyMonths = Number(warrantyPeriodMonths);
            if (!Number.isFinite(warrantyMonths) || warrantyMonths <= 0) {
                return res.status(400).json({ message: 'warrantyPeriodMonths должен быть положительным числом' });
            }

            const parsedStart = parseDate(startDate, 'startDate');
            const parsedEnd = parseDate(endDate, 'endDate');
            if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
                return res.status(400).json({ message: 'startDate не может быть позже endDate' });
            }

            if (!STATUS_VALUES.includes(status)) {
                return res.status(400).json({ message: 'Недопустимый статус гарантии' });
            }

            const serviceRequest = await ServiceRequest.findByPk(requestId);
            if (!serviceRequest) {
                return res.status(404).json({ message: 'Заявка на сервис не найдена' });
            }
            if (serviceRequest.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: 'Невозможно оформить гарантию для чужой заявки' });
            }

            let serviceId = null;
            if (workshopServiceId !== undefined && workshopServiceId !== null && workshopServiceId !== '') {
                serviceId = Number(workshopServiceId);
                if (!Number.isInteger(serviceId)) {
                    return res.status(400).json({ message: 'workshopServiceId должен быть целым числом' });
                }
                const workshopService = await WorkshopService.findByPk(serviceId);
                if (!workshopService || workshopService.serviceCenterId !== serviceCenterId) {
                    return res.status(400).json({ message: 'Указанная услуга мастерской недоступна' });
                }
            }

            const warranty = await RepairWarranty.create({
                serviceCenterId,
                serviceRequestId: requestId,
                workshopServiceId: serviceId,
                coverageDescription: String(coverageDescription).trim(),
                warrantyPeriodMonths: Math.round(warrantyMonths),
                conditions: conditions ? String(conditions).trim() : null,
                status,
                startDate: parsedStart,
                endDate: parsedEnd,
            });

            const withRelations = await RepairWarranty.findByPk(warranty.id, {
                include: [
                    { model: ServiceRequest, as: 'serviceRequest' },
                    { model: WorkshopService, as: 'workshopService' },
                ],
            });

            return res.status(201).json(withRelations);
        } catch (error) {
            console.error('Ошибка при создании гарантии на ремонт:', error);
            return res.status(500).json({ message: error.message || 'Внутренняя ошибка сервера' });
        }
    }

    async findAll(req, res) {
        try {
            const { serviceCenterId, serviceRequestId, status } = req.query;
            const where = {};

            if (serviceCenterId !== undefined) {
                const scId = Number(serviceCenterId);
                if (!Number.isInteger(scId)) {
                    return res.status(400).json({ message: 'serviceCenterId должен быть целым числом' });
                }
                where.serviceCenterId = scId;
            }
            if (serviceRequestId !== undefined) {
                const requestId = Number(serviceRequestId);
                if (!Number.isInteger(requestId)) {
                    return res.status(400).json({ message: 'serviceRequestId должен быть целым числом' });
                }
                where.serviceRequestId = requestId;
            }
            if (status) {
                if (!STATUS_VALUES.includes(status)) {
                    return res.status(400).json({ message: 'Недопустимый статус' });
                }
                where.status = status;
            }

            const warranties = await RepairWarranty.findAll({
                where,
                include: [
                    { model: ServiceRequest, as: 'serviceRequest' },
                    { model: WorkshopService, as: 'workshopService' },
                ],
                order: [['startDate', 'DESC']],
            });

            return res.json(warranties);
        } catch (error) {
            console.error('Ошибка при получении гарантий на ремонт:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    }

    async findOne(req, res) {
        try {
            const { id } = req.params;
            const warranty = await RepairWarranty.findByPk(id, {
                include: [
                    { model: ServiceRequest, as: 'serviceRequest' },
                    { model: WorkshopService, as: 'workshopService' },
                ],
            });
            if (!warranty) {
                return res.status(404).json({ message: 'Гарантия на ремонт не найдена' });
            }
            return res.json(warranty);
        } catch (error) {
            console.error('Ошибка при получении гарантии на ремонт:', error);
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
            const warranty = await RepairWarranty.findByPk(id);
            if (!warranty) {
                return res.status(404).json({ message: 'Гарантия на ремонт не найдена' });
            }
            if (warranty.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: 'Нет доступа к изменению этой гарантии' });
            }

            const {
                coverageDescription,
                warrantyPeriodMonths,
                conditions,
                status,
                startDate,
                endDate,
                workshopServiceId,
            } = req.body;

            const payload = {};
            if (coverageDescription !== undefined) payload.coverageDescription = String(coverageDescription).trim();
            if (warrantyPeriodMonths !== undefined) {
                const months = Number(warrantyPeriodMonths);
                if (!Number.isFinite(months) || months <= 0) {
                    return res.status(400).json({ message: 'warrantyPeriodMonths должен быть положительным числом' });
                }
                payload.warrantyPeriodMonths = Math.round(months);
            }
            if (conditions !== undefined) payload.conditions = conditions ? String(conditions).trim() : null;
            if (status !== undefined) {
                if (!STATUS_VALUES.includes(status)) {
                    return res.status(400).json({ message: 'Недопустимый статус гарантии' });
                }
                payload.status = status;
            }
            if (startDate !== undefined) payload.startDate = parseDate(startDate, 'startDate');
            if (endDate !== undefined) payload.endDate = parseDate(endDate, 'endDate');
            if (payload.startDate && payload.endDate && payload.startDate > payload.endDate) {
                return res.status(400).json({ message: 'startDate не может быть позже endDate' });
            }

            if (workshopServiceId !== undefined) {
                if (workshopServiceId === null || workshopServiceId === '') {
                    payload.workshopServiceId = null;
                } else {
                    const serviceId = Number(workshopServiceId);
                    if (!Number.isInteger(serviceId)) {
                        return res.status(400).json({ message: 'workshopServiceId должен быть целым числом' });
                    }
                    const workshopService = await WorkshopService.findByPk(serviceId);
                    if (!workshopService || workshopService.serviceCenterId !== serviceCenterId) {
                        return res.status(400).json({ message: 'Указанная услуга мастерской недоступна' });
                    }
                    payload.workshopServiceId = serviceId;
                }
            }

            await warranty.update(payload);

            const withRelations = await RepairWarranty.findByPk(warranty.id, {
                include: [
                    { model: ServiceRequest, as: 'serviceRequest' },
                    { model: WorkshopService, as: 'workshopService' },
                ],
            });

            return res.json(withRelations);
        } catch (error) {
            console.error('Ошибка при обновлении гарантии на ремонт:', error);
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
            const warranty = await RepairWarranty.findByPk(id);
            if (!warranty) {
                return res.status(404).json({ message: 'Гарантия на ремонт не найдена' });
            }
            if (warranty.serviceCenterId !== serviceCenterId) {
                return res.status(403).json({ message: 'Нет доступа к удалению этой гарантии' });
            }

            await warranty.destroy();
            return res.json({ message: 'Гарантия на ремонт удалена' });
        } catch (error) {
            console.error('Ошибка при удалении гарантии на ремонт:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    }
}

module.exports = new RepairWarrantyController();
