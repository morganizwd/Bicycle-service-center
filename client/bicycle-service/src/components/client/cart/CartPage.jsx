// src/components/client/cart/CartPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';
import { mediaUrl } from '../../../utils/media';

export default function CartPage() {
    const { user } = useAuth(); // сам токен не нужен – axios сам подставит
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState(null);
    const [updating, setUpdating] = useState(null); // productId в процессе

    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get('/carts');
            setCart(data);
        } catch (e) {
            const msg = e?.response?.data?.message || 'Не удалось загрузить корзину';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const subtotal = useMemo(() => {
        if (!cart?.CartItems) return 0;
        return cart.CartItems.reduce(
            (sum, ci) => sum + Number(ci.Product?.price || 0) * ci.quantity,
            0
        );
    }, [cart]);

    async function changeQty(productId, nextQty) {
        if (nextQty <= 0) return removeItem(productId);
        try {
            setUpdating(productId);
            await api.put(`/carts/update/${productId}`, { quantity: nextQty });
            await load();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Не удалось обновить количество');
        } finally {
            setUpdating(null);
        }
    }

    async function removeItem(productId) {
        try {
            setUpdating(productId);
            await api.delete(`/carts/remove/${productId}`);
            toast.success('Товар удалён из корзины');
            await load();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Не удалось удалить товар');
        } finally {
            setUpdating(null);
        }
    }

    async function clearCart() {
        try {
            setUpdating('all');
            await api.delete('/carts/clear');
            toast.success('Корзина очищена');
            await load();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Не удалось очистить корзину');
        } finally {
            setUpdating(null);
        }
    }

    if (!user) {
        // На всякий случай (хотя маршрут и так под PrivateRoute)
        navigate('/login', { replace: true, state: { from: '/cart' } });
        return null;
    }

    if (loading) return <div className="d-flex justify-content-center py-5"><Spinner /></div>;

    const items = cart?.CartItems || [];

    return (
        <>
            <h3 className="mb-3">Корзина</h3>

            {items.length === 0 ? (
                <Card body>
                    Корзина пуста. Перейти в <Link to="/products">каталог</Link>.
                </Card>
            ) : (
                <Row className="g-3">
                    <Col lg={8}>
                        <Card>
                            <Card.Body>
                                <Table responsive className="align-middle">
                                    <thead>
                                        <tr>
                                            <th>Товар</th>
                                            <th className="text-end">Цена</th>
                                            <th className="text-center">Кол-во</th>
                                            <th className="text-end">Сумма</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(ci => (
                                            <tr key={ci.id}>
                                                <td>
                                                    <div className="d-flex align-items-center gap-2">
                                                        {ci.Product?.photo && (
                                                            <img
                                                                src={mediaUrl(ci.Product.photo)}
                                                                alt={ci.Product.name}
                                                                width={56}
                                                                height={56}
                                                                style={{ objectFit: 'cover', borderRadius: 8 }}
                                                            />
                                                        )}
                                                        <div>
                                                            <div className="fw-semibold">
                                                                <Link to={`/product/${ci.Product?.id}`}>{ci.Product?.name}</Link>
                                                            </div>
                                                            <div className="text-muted small">
                                                                {ci.Product?.brand} {ci.Product?.model}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-end">{Number(ci.Product?.price || 0).toFixed(2)} ₽</td>
                                                <td className="text-center">
                                                    <div className="d-inline-flex align-items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline-secondary"
                                                            disabled={updating === ci.productId}
                                                            onClick={() => changeQty(ci.productId, ci.quantity - 1)}
                                                        >
                                                            −
                                                        </Button>
                                                        <span className="px-2">{ci.quantity}</span>
                                                        <Button
                                                            size="sm"
                                                            disabled={updating === ci.productId}
                                                            onClick={() => changeQty(ci.productId, ci.quantity + 1)}
                                                        >
                                                            +
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td className="text-end">
                                                    {(Number(ci.Product?.price || 0) * ci.quantity).toFixed(2)} ₽
                                                </td>
                                                <td className="text-end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        disabled={updating === ci.productId}
                                                        onClick={() => removeItem(ci.productId)}
                                                    >
                                                        Удалить
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                                <div className="d-flex justify-content-between">
                                    <Button
                                        variant="outline-secondary"
                                        onClick={clearCart}
                                        disabled={updating === 'all'}
                                    >
                                        Очистить корзину
                                    </Button>
                                    <Button as={Link} to="/products" variant="link">
                                        Продолжить покупки
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={4}>
                        <Card>
                            <Card.Body>
                                <div className="d-flex justify-content-between">
                                    <div>Итого:</div>
                                    <div className="fw-bold">{subtotal.toFixed(2)} ₽</div>
                                </div>
                                <Button className="mt-3 w-100" onClick={() => navigate('/checkout')}>
                                    Перейти к оформлению
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </>
    );
}
