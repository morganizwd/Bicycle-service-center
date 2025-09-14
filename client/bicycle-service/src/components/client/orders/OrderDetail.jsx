import React, { useEffect, useState } from 'react';
import { Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '/api';

const statusColor = (s) => ({
    pending: 'secondary',
    processing: 'info',
    shipped: 'primary',
    delivered: 'success',
    cancelled: 'danger'
}[s] || 'secondary');

export default function OrderDetail() {
    const { token } = useAuth();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error();
            setOrder(await res.json());
        } catch {
            toast.error('Не удалось загрузить заказ');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    if (loading) return <div className="d-flex justify-content-center py-5"><Spinner /></div>;
    if (!order) return null;

    return (
        <>
            <h3 className="mb-3">Заказ #{order.id}</h3>
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
                                    {order.orderItems?.map(oi => (
                                        <tr key={oi.id}>
                                            <td>{oi.Product?.name}</td>
                                            <td className="text-end">{Number(oi.priceAtPurchase).toFixed(2)} ₽</td>
                                            <td className="text-center">{oi.quantity}</td>
                                            <td className="text-end">{(Number(oi.priceAtPurchase) * oi.quantity).toFixed(2)} ₽</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4}>
                    <Card>
                        <Card.Body>
                            <div className="mb-2">Статус: <Badge bg={statusColor(order.status)}>{order.status}</Badge></div>
                            <div className="mb-2">Дата: <strong>{new Date(order.orderDate).toLocaleString()}</strong></div>
                            <div className="mb-2">Адрес: <strong>{order.deliveryAddress}</strong></div>
                            <div className="d-flex justify-content-between">
                                <div>Итого:</div>
                                <div className="fw-bold">{Number(order.totalCost).toFixed(2)} ₽</div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </>
    );
}
