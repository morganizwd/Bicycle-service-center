// src/components/client/checkout/CheckoutPage.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

export default function CheckoutPage() {
    const { user } = useAuth(); // сам токен не нужен — axios подставит из localStorage
    const navigate = useNavigate();

    const [loadingCart, setLoadingCart] = useState(true);
    const [cart, setCart] = useState(null);

    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [deliveryMethod, setDeliveryMethod] = useState('самовывоз');
    const [submitting, setSubmitting] = useState(false);

    async function loadCart() {
        setLoadingCart(true);
        try {
            const { data } = await api.get('/carts');
            setCart(data);
        } catch (e) {
            const msg = e?.response?.data?.message || 'Не удалось загрузить корзину';
            toast.error(msg);
        } finally {
            setLoadingCart(false);
        }
    }

    useEffect(() => { loadCart(); }, []);

    const subtotal = useMemo(() => {
        if (!cart?.CartItems) return 0;
        return cart.CartItems.reduce(
            (sum, ci) => sum + Number(ci.Product?.price || 0) * ci.quantity,
            0
        );
    }, [cart]);

    async function placeOrder(e) {
        e.preventDefault();
        if (!cart?.CartItems?.length) {
            toast.error('Корзина пуста');
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await api.post('/orders', {
                deliveryAddress,
                paymentMethod,
                deliveryMethod,
            });
            const orderId = data?.order?.id || data?.id; // на случай разной формы ответа
            toast.success('Заказ оформлен');
            navigate(`/orders/${orderId}`);
        } catch (e) {
            const msg = e?.response?.data?.message || 'Не удалось оформить заказ';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }

    // На всякий случай (хотя маршрут обёрнут в PrivateRoute)
    if (!user) {
        navigate('/login', { replace: true, state: { from: '/checkout' } });
        return null;
    }

    if (loadingCart) return <div className="d-flex justify-content-center py-5"><Spinner /></div>;

    return (
        <>
            <h3 className="mb-3">Оформление заказа</h3>
            <Row className="g-3">
                <Col lg={8}>
                    <Card>
                        <Card.Body>
                            <Form onSubmit={placeOrder}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Адрес доставки</Form.Label>
                                    <Form.Control
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        placeholder="Город, улица, дом, квартира"
                                        required
                                    />
                                </Form.Group>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Способ доставки</Form.Label>
                                            <Form.Select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)}>
                                                <option value="самовывоз">Самовывоз</option>
                                                <option value="курьер">Курьер</option>
                                                <option value="доставка сервисом">Доставка сервисом</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Оплата</Form.Label>
                                            <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                                <option value="cash">Наличные</option>
                                                <option value="card">Картой</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Button type="submit" disabled={submitting}>Подтвердить заказ</Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4}>
                    <Card>
                        <Card.Body>
                            <div className="mb-2">Товары: <strong>{cart?.CartItems?.length || 0}</strong></div>
                            <div className="d-flex justify-content-between">
                                <div>Итого к оплате:</div>
                                <div className="fw-bold">{subtotal.toFixed(2)} ₽</div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </>
    );
}
