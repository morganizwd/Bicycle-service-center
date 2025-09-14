const {
    Order,
    OrderItem,
    Cart,
    CartItem,
    Product,
    User,
    ServiceCenter,
    Review
} = require('../models/models');

class OrderController {
    async createOrder(req, res) {
        try {
            const {
                deliveryAddress,
                paymentMethod,
                deliveryMethod, // 'самовывоз' | 'курьер' | 'доставка сервисом'
            } = req.body;

            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ message: 'Неавторизованный пользователь' });

            const user = await User.findByPk(userId);
            if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

            const cart = await Cart.findOne({
                where: { userId },
                include: [{ model: CartItem, include: [Product] }],
            });

            if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
                return res.status(400).json({ message: 'Ваша корзина пуста' });
            }

            // Все товары должны быть из одного сервисного центра
            const serviceCenterIds = [...new Set(cart.CartItems.map(i => i.Product.serviceCenterId))];
            if (serviceCenterIds.length > 1) {
                return res.status(400).json({ message: 'Все товары должны принадлежать одному сервисному центру' });
            }

            // Рассчитать итоговую стоимость
            let totalCost = cart.CartItems.reduce((acc, item) =>
                acc + parseFloat(item.Product.price) * item.quantity, 0);

            const trackingNumber = `TRK-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

            const order = await Order.create({
                deliveryAddress,
                totalCost,
                status: 'pending',
                paymentMethod,
                trackingNumber,
                orderDate: new Date(),
                userId,
                serviceCenterId: serviceCenterIds[0],
                deliveryMethod,
            });

            // Создать позиции заказа
            const orderItems = cart.CartItems.map(item => ({
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                priceAtPurchase: item.Product.price,
            }));
            await OrderItem.bulkCreate(orderItems);

            // Очистить корзину
            await CartItem.destroy({ where: { cartId: cart.id } });

            return res.status(201).json({ message: 'Заказ успешно создан', order });
        } catch (error) {
            console.error('Ошибка при создании заказа:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async getUserOrders(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ message: 'Неавторизованный пользователь' });

            const orders = await Order.findAll({
                where: { userId },
                include: [
                    { model: OrderItem, as: 'orderItems', include: [Product] },
                    { model: Review, include: [{ model: User, attributes: ['firstName', 'lastName'] }] },
                ],
                order: [['orderDate', 'DESC']],
            });

            return res.json(orders);
        } catch (error) {
            console.error('Ошибка при получении заказов пользователя:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async getOrderById(req, res) {
        try {
            const { id } = req.params;

            const order = await Order.findByPk(id, {
                include: [
                    { model: OrderItem, as: 'orderItems', include: [Product] },
                    { model: Review, include: [{ model: User, attributes: ['firstName', 'lastName'] }] },
                ],
            });

            if (!order) return res.status(404).json({ message: 'Заказ не найден' });
            return res.json(order);
        } catch (error) {
            console.error('Ошибка при получении заказа:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const order = await Order.findByPk(id);
            if (!order) return res.status(404).json({ message: 'Заказ не найден' });

            const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ message: 'Недопустимый статус заказа' });
            }

            order.status = status;
            await order.save();

            return res.json(order);
        } catch (error) {
            console.error('Ошибка при обновлении статуса заказа:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Обновление деталей заказа (в текущей модели есть только deliveryMethod из перечисленных)
    async updateOrderDetails(req, res) {
        try {
            const { id } = req.params;
            const { deliveryMethod } = req.body;

            const order = await Order.findByPk(id);
            if (!order) return res.status(404).json({ message: 'Заказ не найден' });

            if (deliveryMethod) order.deliveryMethod = deliveryMethod;

            await order.save();
            return res.json({ message: 'Детали заказа обновлены', order });
        } catch (error) {
            console.error('Ошибка при обновлении деталей заказа:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async deleteOrder(req, res) {
        try {
            const { id } = req.params;
            const order = await Order.findByPk(id);
            if (!order) return res.status(404).json({ message: 'Заказ не найден' });

            // Разрешить удаление владельцу заказа или сервис-центру, которому принадлежит заказ
            if (req.user?.userId) {
                if (order.userId !== req.user.userId) {
                    return res.status(403).json({ message: 'Нет прав для удаления этого заказа' });
                }
            } else if (req.user?.serviceCenterId) {
                if (order.serviceCenterId !== req.user.serviceCenterId) {
                    return res.status(403).json({ message: 'Нет прав для удаления этого заказа' });
                }
            } else {
                return res.status(403).json({ message: 'Нет прав для удаления этого заказа' });
            }

            await OrderItem.destroy({ where: { orderId: id } });
            await order.destroy();
            return res.status(200).json({ message: 'Заказ успешно удалён' });
        } catch (error) {
            console.error('Ошибка при удалении заказа:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Заказы для конкретного сервис-центра (по токену сервис-центра)
    async getServiceCenterOrders(req, res) {
        try {
            const serviceCenterId = req.user?.serviceCenterId;
            console.log('Получение заказов для сервис-центра ID:', serviceCenterId);
            if (!serviceCenterId) {
                return res.status(401).json({ message: 'Неавторизованный пользователь' });
            }

            const center = await ServiceCenter.findByPk(serviceCenterId);
            if (!center) return res.status(404).json({ message: 'Сервисный центр не найден' });

            const orders = await Order.findAll({
                where: { serviceCenterId: center.id },
                include: [
                    { model: User, attributes: ['firstName', 'lastName', 'phone'] },
                    { model: OrderItem, as: 'orderItems', include: [Product] },
                ],
                order: [['orderDate', 'DESC']],
            });

            return res.json(orders);
        } catch (error) {
            console.error('Ошибка при получении заказов сервисного центра:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new OrderController();
