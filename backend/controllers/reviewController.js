const { Review, User, ServiceCenter, Order, Product, OrderItem } = require('../models/models');

class ReviewController {
    async createReview(req, res) {
        try {
            const {
                rating,
                shortReview,
                reviewText,
                orderId,
                productId // опционально
            } = req.body;

            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ message: 'Неавторизованный пользователь' });

            const order = await Order.findByPk(orderId);
            if (!order) return res.status(404).json({ message: 'Заказ не найден' });

            // заказ должен принадлежать пользователю
            if (order.userId !== userId) {
                return res.status(403).json({ message: 'Нельзя оставлять отзыв по чужому заказу' });
            }

            // отзыв только для выполненных заказов
            if (order.status !== 'delivered') {
                return res.status(400).json({ message: 'Отзыв можно оставить только для выполненных заказов' });
            }

            // один отзыв на заказ
            const existingReview = await Review.findOne({ where: { orderId } });
            if (existingReview) {
                return res.status(400).json({ message: 'Отзыв для данного заказа уже существует' });
            }

            // если передан productId — убеждаемся, что товар есть в заказе
            if (productId) {
                const hasProduct = await OrderItem.findOne({ where: { orderId, productId } });
                if (!hasProduct) {
                    return res.status(400).json({ message: 'Указанный товар отсутствует в составе заказа' });
                }
            }

            const serviceCenterId = order.serviceCenterId;

            const review = await Review.create({
                rating,
                shortReview,
                reviewText,
                orderId,
                productId: productId || null,
                serviceCenterId,
                userId
            });

            return res.status(201).json(review);
        } catch (error) {
            console.error('Ошибка при создании отзыва:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async getReviewById(req, res) {
        try {
            const { id } = req.params;

            const review = await Review.findByPk(id, {
                include: [
                    { model: Order },
                    { model: ServiceCenter },
                    { model: Product, attributes: ['id', 'name'] },
                    { model: User, attributes: ['firstName', 'lastName'] },
                ],
            });

            if (!review) return res.status(404).json({ message: 'Отзыв не найден' });
            return res.json(review);
        } catch (error) {
            console.error('Ошибка при получении отзыва:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async getAllReviews(req, res) {
        try {
            const reviews = await Review.findAll({
                include: [
                    { model: Order },
                    { model: ServiceCenter },
                    { model: Product, attributes: ['id', 'name'] },
                    { model: User, attributes: ['firstName', 'lastName'] },
                ],
                order: [['createdAt', 'DESC']],
            });

            return res.json(reviews);
        } catch (error) {
            console.error('Ошибка при получении отзывов:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async updateReview(req, res) {
        try {
            const { id } = req.params;
            const { rating, shortReview, reviewText, productId } = req.body; // productId опционально
            const userId = req.user?.userId;

            const review = await Review.findByPk(id);
            if (!review) return res.status(404).json({ message: 'Отзыв не найден' });

            if (review.userId !== userId) {
                return res.status(403).json({ message: 'Нет доступа для редактирования этого отзыва' });
            }

            // если меняют productId — проверим, что он был в заказе
            if (productId && productId !== review.productId) {
                const hasProduct = await OrderItem.findOne({ where: { orderId: review.orderId, productId } });
                if (!hasProduct) {
                    return res.status(400).json({ message: 'Указанный товар отсутствует в составе заказа' });
                }
            }

            await review.update({
                rating,
                shortReview,
                reviewText,
                productId: productId ?? review.productId
            });

            return res.json(review);
        } catch (error) {
            console.error('Ошибка при обновлении отзыва:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async deleteReview(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;

            const review = await Review.findByPk(id);
            if (!review) return res.status(404).json({ message: 'Отзыв не найден' });

            if (review.userId !== userId) {
                return res.status(403).json({ message: 'Нет доступа для удаления этого отзыва' });
            }

            await review.destroy();
            return res.status(200).json({ message: 'Отзыв успешно удалён' });
        } catch (error) {
            console.error('Ошибка при удалении отзыва:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async getReviewsByServiceCenter(req, res) {
        try {
            const serviceCenterId = parseInt(req.params.serviceCenterId, 10);
            const reviews = await Review.findAll({
                where: { serviceCenterId },
                include: [
                    { model: Order },
                    { model: ServiceCenter },
                    { model: Product, attributes: ['id', 'name'] },
                    { model: User, attributes: ['firstName', 'lastName'] },
                ],
                order: [['createdAt', 'DESC']],
            });
            return res.json(reviews);
        } catch (error) {
            console.error('Ошибка при получении отзывов сервисного центра:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new ReviewController();
