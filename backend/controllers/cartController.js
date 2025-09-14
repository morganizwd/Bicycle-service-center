const { Cart, CartItem, Product, User } = require('../models/models');

class CartController {
    async getBasket(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ message: 'Не авторизован' });

            console.log(`Получение корзины для пользователя ID: ${userId}`);

            let cart = await Cart.findOne({
                where: { userId },
                include: [
                    {
                        model: CartItem,
                        include: [Product],
                    },
                ],
            });

            if (!cart) {
                console.log('Корзина отсутствует. Создание новой корзины.');
                await Cart.create({ userId });
                // перезагружаем с include для единообразия ответа
                cart = await Cart.findOne({
                    where: { userId },
                    include: [
                        {
                            model: CartItem,
                            include: [Product],
                        },
                    ],
                });
            }

            console.log('Полученная корзина:', cart?.toJSON?.() ?? cart);
            return res.json(cart);
        } catch (error) {
            console.error('Ошибка при получении корзины:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async addItem(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ message: 'Не авторизован' });

            const { productId, quantity } = req.body;

            if (!quantity || Number(quantity) <= 0) {
                return res.status(400).json({ message: 'Количество должно быть больше нуля.' });
            }

            const product = await Product.findByPk(productId);
            if (!product) {
                return res.status(404).json({ message: 'Товар не найден.' });
            }

            let cart = await Cart.findOne({
                where: { userId },
                include: [
                    {
                        model: CartItem,
                        include: [Product],
                    },
                ],
            });

            if (!cart) {
                cart = await Cart.create({ userId });
                cart = await Cart.findOne({
                    where: { userId },
                    include: [{ model: CartItem, include: [Product] }],
                });
            }

            // В корзине товары должны быть от одного сервисного центра
            if (cart.CartItems && cart.CartItems.length > 0) {
                const existingServiceCenterId = cart.CartItems[0].Product.serviceCenterId;
                if (existingServiceCenterId !== product.serviceCenterId) {
                    return res.status(400).json({
                        message: 'В корзине могут быть товары только от одного сервисного центра.',
                    });
                }
            }

            let cartItem = await CartItem.findOne({
                where: { cartId: cart.id, productId },
                include: [Product],
            });

            if (cartItem) {
                cartItem.quantity += Number(quantity);
                await cartItem.save();
            } else {
                cartItem = await CartItem.create({
                    cartId: cart.id,
                    productId,
                    quantity: Number(quantity),
                });
                cartItem = await CartItem.findByPk(cartItem.id, { include: [Product] });
            }

            return res.status(201).json(cartItem);
        } catch (error) {
            console.error('Ошибка при добавлении товара в корзину:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async removeItem(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ message: 'Не авторизован' });

            const { productId } = req.params;

            const cart = await Cart.findOne({ where: { userId } });
            if (!cart) {
                return res.status(404).json({ message: 'Корзина не найдена' });
            }

            const cartItem = await CartItem.findOne({
                where: { cartId: cart.id, productId },
            });

            if (!cartItem) {
                return res.status(404).json({ message: 'Товар в корзине не найден' });
            }

            await cartItem.destroy();
            return res.status(200).json({ message: 'Товар успешно удалён из корзины' });
        } catch (error) {
            console.error('Ошибка при удалении товара из корзины:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async updateItemQuantity(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ message: 'Не авторизован' });

            const { productId } = req.params;
            const { quantity } = req.body;

            if (!quantity || Number(quantity) <= 0) {
                return res.status(400).json({ message: 'Количество должно быть больше нуля.' });
            }

            const cart = await Cart.findOne({ where: { userId } });
            if (!cart) {
                return res.status(404).json({ message: 'Корзина не найдена' });
            }

            const cartItem = await CartItem.findOne({
                where: { cartId: cart.id, productId },
            });

            if (!cartItem) {
                return res.status(404).json({ message: 'Товар в корзине не найден' });
            }

            cartItem.quantity = Number(quantity);
            await cartItem.save();

            return res.status(200).json(cartItem);
        } catch (error) {
            console.error('Ошибка при обновлении количества товара в корзине:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    async clearCart(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ message: 'Не авторизован' });

            const cart = await Cart.findOne({ where: { userId } });
            if (!cart) {
                return res.status(404).json({ message: 'Корзина не найдена' });
            }

            await CartItem.destroy({ where: { cartId: cart.id } });
            return res.status(200).json({ message: 'Корзина успешно очищена' });
        } catch (error) {
            console.error('Ошибка при очистке корзины:', error);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new CartController();