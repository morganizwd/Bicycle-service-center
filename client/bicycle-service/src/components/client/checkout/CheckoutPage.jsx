import React, { useMemo, useState, useEffect } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '/api';

export default function CheckoutPage() {
    const { token } = useAuth();
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
            const res = await fetch(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setCart(data);
        } catch {
            toast.error('Не удалось загрузить корзину');
        } finally {
            setLoadingCart(false);
        }
    }

    useEffect(() => { loadCart(); /* eslint-disable-next-line */ }, []);

    const subtotal = useMemo(() => {
        if (!cart?.CartItems) return 0;
        return cart.CartItems.reduce((sum, ci) => sum + Number(ci.Product?.price || 0) * ci.quantity, 0);
    }, [cart]);

    async function placeOrder(e) {
        e.preventDefault();
        if (!cart?.CartItems?.length) {
            toast.error('Корзина пуста');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ deliveryAddress, paymentMethod, deliveryMethod }),
            });
            if (!res.ok) {
                let msg = 'Не удалось оформить заказ';
                try { const err = await res.json(); if (err?.message) msg = err.message; } catch { }
                throw new Error(msg);
            }
            const { order } = await res.json();
            toast.success('Заказ оформлен');
            navigate(`/orders/${order.id}`);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
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
