// src/components/center/orders/CenterOrderManagement.jsx
import React, { useEffect, useState } from 'react';
import { Table, Badge, Form, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function CenterOrderManagement() {
    const { center, centerLoading } = useAuth();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        if (!center) {
            setOrders([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // заказы сервисного центра: GET /service-centers/orders
            const { data } = await api.get('/service-centers/orders');
            setOrders(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Не удалось загрузить заказы');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center]);

    async function updateStatus(id, status) {
        try {
            await api.put(`/orders/${id}/status`, { status });
            toast.success('Статус обновлён');
            await load();
        } catch {
            toast.error('Ошибка при обновлении статуса');
        }
    }

    if (centerLoading || loading) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    if (!center) {
        return <div>Требуется вход сервисного центра</div>;
    }

    return (
        <>
            <h3 className="mb-3">Заказы</h3>
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Дата</th>
                        <th>Покупатель</th>
                        <th>Сумма</th>
                        <th>Доставка</th>
                        <th>Статус</th>
                        <th>Товары</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((o, i) => (
                        <tr key={o.id}>
                            <td>{i + 1}</td>
                            <td>{o.orderDate ? new Date(o.orderDate).toLocaleString() : '—'}</td>
                            <td>{o.User ? `${o.User.firstName} ${o.User.lastName}` : '—'}</td>
                            <td>{o.totalCost} ₽</td>
                            <td>{o.deliveryMethod || '—'}</td>
                            <td className="text-nowrap">
                                <Badge bg="secondary" className="me-2">
                                    {o.status}
                                </Badge>
                                <Form.Select
                                    size="sm"
                                    style={{ width: 160, display: 'inline-block' }}
                                    value={o.status}
                                    onChange={(e) => updateStatus(o.id, e.target.value)}
                                >
                                    {STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </Form.Select>
                            </td>
                            <td>
                                {(o.orderItems || []).map((oi) => (
                                    <div key={oi.id}>
                                        {oi.Product?.name || 'Товар'} × {oi.quantity}
                                    </div>
                                ))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    );
}
