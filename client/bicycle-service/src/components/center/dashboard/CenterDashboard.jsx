// src/components/center/dashboard/CenterDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

export default function CenterDashboard() {
    const { center, centerLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [requests, setRequests] = useState([]);
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        let aborted = false;

        async function load() {
            if (!center) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const [prodRes, ordersRes, reqRes, revRes] = await Promise.all([
                    // товары центра
                    api.get('/products', { params: { serviceCenterId: center.id } }),
                    // заказы центра (по токену сервис-центра)
                    api.get('/service-centers/orders'),
                    // заявки на сервис (camelCase путь!)
                    api.get('/serviceRequests', { params: { serviceCenterId: center.id } }),
                    // отзывы по центру
                    api.get(`/reviews/center/${center.id}`),
                ]);

                if (aborted) return;

                setProducts(prodRes.data || []);
                setOrders(ordersRes.data || []);
                setRequests(reqRes.data || []);
                setReviews(revRes.data || []);
            } catch (e) {
                if (!aborted) toast.error('Не удалось загрузить данные дашборда');
            } finally {
                if (!aborted) setLoading(false);
            }
        }

        load();
        return () => {
            aborted = true;
        };
    }, [center]);

    const metrics = useMemo(() => {
        const ordersPending = orders.filter((o) => o.status === 'pending').length;
        const ordersProcessing = orders.filter((o) => o.status === 'processing').length;
        const revenue = orders
            .filter((o) => o.status === 'delivered')
            .reduce((sum, o) => sum + Number(o.totalCost || 0), 0);
        const avgRating = reviews.length
            ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
            : '—';
        const openRequests = requests.filter((r) => r.status !== 'выполнена' && r.status !== 'отменена').length;
        return { ordersPending, ordersProcessing, revenue, avgRating, openRequests };
    }, [orders, reviews, requests]);

    if (centerLoading || loading) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    if (!center) {
        // теоретически сюда не попадём из-за ServiceCenterRoute,
        // но оставим фоллбек на всякий случай
        return <div>Требуется вход сервисного центра</div>;
    }

    return (
        <>
            <h3 className="mb-4">Дашборд: {center.name}</h3>
            <Row className="g-3">
                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <Card.Title>Товары</Card.Title>
                            <h2>{products.length}</h2>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <Card.Title>Заказы (в ожидании)</Card.Title>
                            <h2>{metrics.ordersPending}</h2>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <Card.Title>Заказы (в работе)</Card.Title>
                            <h2>{metrics.ordersProcessing}</h2>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <Card.Title>Выручка (доставлено)</Card.Title>
                            <h2>{metrics.revenue} ₽</h2>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <Card.Title>Средний рейтинг</Card.Title>
                            <h2>{metrics.avgRating}</h2>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <Card.Title>Активные заявки</Card.Title>
                            <h2>{metrics.openRequests}</h2>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </>
    );
}
