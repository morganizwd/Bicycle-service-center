import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from './api/axiosConfig';
import { AuthContext } from './AuthContext';
import { Toast, ToastContainer } from 'react-bootstrap';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { authData } = useContext(AuthContext);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState({
        open: false,
        message: '',
        variant: 'success',
    });

    const fetchCart = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/carts', {
                headers: {
                    Authorization: `Bearer ${authData.token}`,
                },
            });
            console.log('Полученные CartItems:', response.data.CartItems);
            setCartItems(response.data.CartItems || []);
        } catch (error) {
            console.error('Ошибка при получении корзины:', error);
            setError('Не удалось загрузить корзину.');
            handleToastOpen('Не удалось загрузить корзину.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authData.isAuthenticated) {
            fetchCart();
        } else {
            setCartItems([]);
        }
    }, [authData.isAuthenticated, authData.token]);

    const handleToastOpen = (message, variant = 'success') => {
        setToast({ open: true, message, variant });
    };

    const handleToastClose = () => {
        setToast({ ...toast, open: false });
    };

    const addToCart = async (product, quantity) => {
        if (cartItems.length > 0 && cartItems[0].Product.equipmentsellerId !== product.equipmentsellerId) {
            setError('Вы можете добавлять товары только от одного продавца.');
            handleToastOpen('Вы можете добавлять товары только от одного продавца.', 'danger');
            return;
        }
        try {
            const response = await axios.post(
                '/api/carts/add',
                { productId: product.id, quantity },
                {
                    headers: {
                        Authorization: `Bearer ${authData.token}`,
                    },
                }
            );
            const addedItem = response.data;
            setCartItems((prevItems) => {
                const existingItem = prevItems.find((item) => item.productId === addedItem.productId);
                if (existingItem) {
                    return prevItems.map((item) =>
                        item.productId === addedItem.productId
                            ? { ...item, quantity: item.quantity + addedItem.quantity }
                            : item
                    );
                } else {
                    return [...prevItems, addedItem];
                }
            });
            handleToastOpen(`Добавлено ${quantity} x ${product.name} в корзину!`, 'success');
        } catch (error) {
            console.error('Ошибка при добавлении товара в корзину:', error);
            setError(error.response?.data?.message || 'Не удалось добавить товар в корзину.');
            handleToastOpen(error.response?.data?.message || 'Не удалось добавить товар в корзину.', 'danger');
        }
    };

    const removeFromCart = async (productId) => {
        try {
            await axios.delete(`/api/carts/remove/${productId}`, {
                headers: {
                    Authorization: `Bearer ${authData.token}`,
                },
            });
            setCartItems((prevItems) => prevItems.filter((item) => item.productId !== productId));
            handleToastOpen('Товар успешно удален из корзины.', 'success');
        } catch (error) {
            console.error('Ошибка при удалении товара из корзины:', error);
            setError('Не удалось удалить товар из корзины.');
            handleToastOpen('Не удалось удалить товар из корзины.', 'danger');
        }
    };

    const updateQuantity = async (productId, quantity) => {
        try {
            const response = await axios.put(
                `/api/carts/update/${productId}`,
                { quantity },
                {
                    headers: {
                        Authorization: `Bearer ${authData.token}`,
                    },
                }
            );
            const updatedItem = response.data;
            setCartItems((prevItems) =>
                prevItems.map((item) =>
                    item.productId === updatedItem.productId ? { ...item, quantity: updatedItem.quantity } : item
                )
            );
            handleToastOpen('Количество товара обновлено.', 'success');
        } catch (error) {
            console.error('Ошибка при обновлении количества товара в корзине:', error);
            setError('Не удалось обновить количество товара в корзине.');
            handleToastOpen('Не удалось обновить количество товара в корзине.', 'danger');
        }
    };

    const clearCart = async () => {
        try {
            await axios.delete('/api/carts/clear', {
                headers: {
                    Authorization: `Bearer ${authData.token}`,
                },
            });
            setCartItems([]);
            handleToastOpen('Корзина успешно очищена.', 'success');
        } catch (error) {
            console.error('Ошибка при очистке корзины:', error);
            setError('Не удалось очистить корзину.');
            handleToastOpen('Не удалось очистить корзину.', 'danger');
        }
    };

    const totalAmount = cartItems.reduce((acc, item) => {
        if (item.Product && item.Product.price) {
            return acc + item.Product.price * item.quantity;
        }
        return acc;
    }, 0);

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                totalAmount,
                loading,
                error,
                fetchCart,
            }}
        >
            {children}
            <ToastContainer position="bottom-center" className="p-3">
                <Toast onClose={handleToastClose} show={toast.open} delay={6000} autohide bg={toast.variant === 'danger' ? 'danger' : 'success'}>
                    <Toast.Header>
                        <strong className="me-auto">{toast.variant === 'danger' ? 'Ошибка' : 'Успех'}</strong>
                    </Toast.Header>
                    <Toast.Body className="text-white">{toast.message}</Toast.Body>
                </Toast>
            </ToastContainer>
        </CartContext.Provider>
    );
};