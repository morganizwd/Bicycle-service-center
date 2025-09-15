// src/components/client/orders/UserOrders.jsx
import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../../api/axiosConfig';

const statusColor = (s) => ({
    pending: 'secondary',
    processing: 'info',
    shipped: 'primary',
    delivered: 'success',
    cancelled: 'danger',
}[s] || 'secondary');

export default function UserOrders() {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        let ignore = false;
        async function load() {
            setLoading(true);
            try {
                // Предполагаем, что GET /api/orders возвращает заказы текущего пользователя
                const { data } = await api.get('/orders');
                if (!ignore) setOrders(Array.isArray(data) ? data : []);
            } catch {
                toast.error('Не удалось загрузить заказы');
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        load();
        return () => { ignore = true; };
    }, []);

    if (loading) return <div className="d-flex justify-content-center py-5"><Spinner /></div>;

    return (
        <>
            <h3 className="mb-3">Мои заказы</h3>
            <Card>
                <Card.Body>
                    <Table responsive hover className="align-middle">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Дата</th>
                                <th>Статус</th>
                                <th className="text-end">Сумма</th>
                                <th className="text-center">Позиций</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o, i) => {
                                const items = o.orderItems || o.OrderItems || [];
                                return (
                                    <tr key={o.id}>
                                        <td>{o.id}</td>
                                        <td>{o.orderDate ? new Date(o.orderDate).toLocaleString() : '—'}</td>
                                        <td><Badge bg={statusColor(o.status)}>{o.status}</Badge></td>
                                        <td className="text-end">{Number(o.totalCost ?? 0).toFixed(2)} ₽</td>
                                        <td className="text-center">{items.length}</td>
                                        <td className="text-end">
                                            <Button as={Link} to={`/orders/${o.id}`} size="sm">Подробнее</Button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted py-4">Заказов пока нет</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </>
    );
}
