const { ServiceRequest, User, ServiceCenter } = require('../models/models');

const ALLOWED_STATUSES = ['запрошена', 'в работе', 'выполнена', 'отменена'];

function isValidDate(d) {
    return d instanceof Date && !isNaN(d.valueOf());
}

class ServiceRequestController {
    // Создание новой заявки на обслуживание (создаёт пользователь)
    async createServiceRequest(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ message: 'Неавторизованный пользователь' });

            const { serviceCenterId, requestDate, problemDescription, bikeModel } = req.body;
            if (!serviceCenterId || !requestDate || !problemDescription) {
                return res.status(400).json({
                    message: 'Заполните все обязательные поля: serviceCenterId, requestDate, problemDescription'
                });
            }

            // проверяем существование сервис-центра
            const center = await ServiceCenter.findByPk(Number(serviceCenterId));
            if (!center) {
                return res.status(404).json({ message: 'Сервисный центр не найден' });
            }

            const parsedDate = new Date(requestDate);
            if (!isValidDate(parsedDate)) {
                return res.status(400).json({ message: 'Некорректная дата requestDate' });
            }

            const newRequest = await ServiceRequest.create({
                userId,
                serviceCenterId: Number(serviceCenterId),
                requestDate: parsedDate,
                status: 'запрошена',
                bikeModel: bikeModel || null,
                problemDescription,
                technicianNotes: null
            });

            return res.status(201).json(newRequest);
        } catch (error) {
            console.error('Ошибка при создании заявки на сервис:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Получение заявки по ID
    async getServiceRequestById(req, res) {
        try {
            const { id } = req.params;
            const request = await ServiceRequest.findByPk(id, {
                include: [
                    { model: User, attributes: ['firstName', 'lastName', 'email', 'phone'] },
                    { model: ServiceCenter, attributes: ['name', 'contactPerson', 'phone'] },
                ],
            });

            if (!request) return res.status(404).json({ message: 'Заявка не найдена' });
            return res.json(request);
        } catch (error) {
            console.error('Ошибка при получении заявки:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Список заявок с фильтрами
    async getAllServiceRequests(req, res) {
        try {
            const { userId, serviceCenterId, status } = req.query;
            const where = {};

            if (userId !== undefined) {
                const uid = parseInt(userId, 10);
                if (!Number.isFinite(uid)) return res.status(400).json({ message: 'Некорректный userId' });
                where.userId = uid;
            }
            if (serviceCenterId !== undefined) {
                const scid = parseInt(serviceCenterId, 10);
                if (!Number.isFinite(scid)) return res.status(400).json({ message: 'Некорректный serviceCenterId' });
                where.serviceCenterId = scid;
            }
            if (status) {
                if (!ALLOWED_STATUSES.includes(status)) {
                    return res.status(400).json({ message: 'Недопустимый статус для фильтрации' });
                }
                where.status = status;
            }

            const requests = await ServiceRequest.findAll({
                where,
                include: [
                    { model: User, attributes: ['firstName', 'lastName', 'email', 'phone'] },
                    { model: ServiceCenter, attributes: ['name', 'contactPerson', 'phone'] },
                ],
                order: [['requestDate', 'DESC']],
            });

            return res.json(requests);
        } catch (error) {
            console.error('Ошибка при получении списка заявок:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Обновление заявки
    async updateServiceRequest(req, res) {
        try {
            const { id } = req.params;
            const { status, technicianNotes, problemDescription, bikeModel, requestDate } = req.body;

            const request = await ServiceRequest.findByPk(id);
            if (!request) return res.status(404).json({ message: 'Заявка не найдена' });

            const currentUserId = req.user?.userId;
            const currentServiceCenterId = req.user?.serviceCenterId;

            // Владелец-заявитель может править своё (текст, дата, модель велика)
            if (currentUserId && request.userId === currentUserId) {
                if (status !== undefined || technicianNotes !== undefined) {
                    return res.status(403).json({ message: 'Пользователь не может обновлять статус или служебные заметки' });
                }
                const updatedData = {};
                if (problemDescription !== undefined) updatedData.problemDescription = problemDescription;
                if (bikeModel !== undefined) updatedData.bikeModel = bikeModel;
                if (requestDate !== undefined) {
                    const parsed = new Date(requestDate);
                    if (!isValidDate(parsed)) return res.status(400).json({ message: 'Некорректная дата requestDate' });
                    updatedData.requestDate = parsed;
                }
                await request.update(updatedData);
                return res.json(request);
            }

            // Сервисный центр может менять статус и служебные заметки
            if (currentServiceCenterId && request.serviceCenterId === currentServiceCenterId) {
                const updatedData = {};
                if (status !== undefined) {
                    if (!ALLOWED_STATUSES.includes(status)) {
                        return res.status(400).json({ message: 'Недопустимый статус заявки' });
                    }
                    updatedData.status = status;
                }
                if (technicianNotes !== undefined) updatedData.technicianNotes = technicianNotes;
                await request.update(updatedData);
                return res.json(request);
            }

            return res.status(403).json({ message: 'Нет доступа для обновления этой заявки' });
        } catch (error) {
            console.error('Ошибка при обновлении заявки:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Удаление заявки
    async deleteServiceRequest(req, res) {
        try {
            const { id } = req.params;
            const request = await ServiceRequest.findByPk(id);
            if (!request) return res.status(404).json({ message: 'Заявка не найдена' });

            const currentUserId = req.user?.userId;
            const currentServiceCenterId = req.user?.serviceCenterId;

            // Удалять может владелец-заявитель или сервисный центр, к которому относится заявка
            if (
                (currentUserId && request.userId === currentUserId) ||
                (currentServiceCenterId && request.serviceCenterId === currentServiceCenterId)
            ) {
                await request.destroy();
                return res.status(200).json({ message: 'Заявка успешно удалена' });
            }

            return res.status(403).json({ message: 'Нет прав для удаления этой заявки' });
        } catch (error) {
            console.error('Ошибка при удалении заявки:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new ServiceRequestController();
