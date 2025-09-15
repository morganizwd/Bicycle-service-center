// src/components/client/orders/OrderDetail.jsx
import React, { useEffect, useState } from 'react';
import { Badge, Card, Col, Row, Spinner, Table, Button } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../../api/axiosConfig';

const statusColor = (s) => ({
    pending: 'secondary',
    processing: 'info',
    shipped: 'primary',
    delivered: 'success',
    cancelled: 'danger',
}[s] || 'secondary');

export default function OrderDetail() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);

    useEffect(() => {
        let ignore = false;
        async function load() {
            setLoading(true);
            try {
                const { data } = await api.get(`/orders/${id}`);
                if (!ignore) setOrder(data);
            } catch {
                toast.error('Не удалось загрузить заказ');
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        load();
        return () => { ignore = true; };
    }, [id]);

    if (loading) return <div className="d-flex justify-content-center py-5"><Spinner /></div>;
    if (!order) return null;

    const items = order.orderItems || order.OrderItems || [];

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="mb-0">Заказ #{order.id}</h3>
                <Button as={Link} to="/orders" variant="outline-secondary" size="sm">← К списку заказов</Button>
            </div>

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
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(oi => {
                                        const price = Number(oi.priceAtPurchase ?? oi.price ?? 0);
                                        const qty = Number(oi.quantity ?? 0);
                                        const name = oi.Product?.name || oi.product?.name || '—';
                                        return (
                                            <tr key={oi.id}>
                                                <td>{name}</td>
                                                <td className="text-end">{price.toFixed(2)} ₽</td>
                                                <td className="text-center">{qty}</td>
                                                <td className="text-end">{(price * qty).toFixed(2)} ₽</td>
                                            </tr>
                                        );
                                    })}
                                    {items.length === 0 && (
                                        <tr><td colSpan={4} className="text-center text-muted py-4">Позиции не найдены</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4}>
                    <Card>
                        <Card.Body>
                            <div className="mb-2">Статус: <Badge bg={statusColor(order.status)}>{order.status}</Badge></div>
                            <div className="mb-2">Дата: <strong>{order.orderDate ? new Date(order.orderDate).toLocaleString() : '—'}</strong></div>
                            <div className="mb-2">Адрес: <strong>{order.deliveryAddress || '—'}</strong></div>
                            <div className="d-flex justify-content-between">
                                <div>Итого:</div>
                                <div className="fw-bold">{Number(order.totalCost ?? 0).toFixed(2)} ₽</div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </>
    );
}
