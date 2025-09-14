import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Row, Col, Card, ListGroup, Spinner, Button, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';

const API = process.env.REACT_APP_API_URL || '/api';

export default function ServiceCenterDetail() {
    const { id } = useParams();
    const [center, setCenter] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let aborted = false;
        async function load() {
            setLoading(true);
            try {
                const res = await fetch(`${API}/service-centers/${id}`);
                if (!res.ok) throw new Error();
                const data = await res.json();
                if (!aborted) setCenter(data);
            } catch {
                toast.error('Не удалось загрузить сервисный центр');
            } finally {
                if (!aborted) setLoading(false);
            }
        }
        load();
        return () => { aborted = true; };
    }, [id]);

    if (loading) return <div className="d-flex justify-content-center py-5"><Spinner /></div>;
    if (!center) return <div className="text-danger">Сервисный центр не найден</div>;

    const products = center.Products || center.products || [];
    const reviews = center.Reviews || center.reviews || [];

    return (
        <>
            <Row className="g-4">
                <Col md={4}>
                    <Card>
                        {center.logo ? (
                            <Card.Img src={center.logo} alt={center.name} style={{ objectFit: 'cover', height: 220 }} />
                        ) : (
                            <div className="p-5 text-center text-muted">Нет логотипа</div>
                        )}
                        <Card.Body>
                            <Card.Title>{center.name}</Card.Title>
                            <div className="text-muted mb-2">{center.address}</div>
                            <div className="mb-2"><strong>Контактное лицо:</strong> {center.contactPerson}</div>
                            <div className="mb-2"><strong>Тел.:</strong> {center.phone}</div>
                            <div className="mb-2"><strong>Email:</strong> {center.email}</div>
                            <div className="mb-2"><strong>Специализация:</strong> {center.specialization}</div>
                            {center.offersDelivery && <Badge bg="success">Есть доставка</Badge>}
                            <div className="mt-3">
                                <Button variant="primary" onClick={() => navigate('/requests/new', { state: { serviceCenterId: center.id } })}>
                                    Оформить заявку на обслуживание
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={8}>
                    <h5 className="mb-2">Товары</h5>
                    <Row className="g-3">
                        {products.map(p => (
                            <Col key={p.id} sm={6} lg={4}>
                                <Card className="h-100">
                                    {p.photo && <Card.Img variant="top" src={p.photo} alt={p.name} style={{ objectFit: 'cover', height: 140 }} />}
                                    <Card.Body>
                                        <Card.Title className="h6">{p.name}</Card.Title>
                                        <div className="text-muted small mb-1">{p.brand} {p.model}</div>
                                        <div className="fw-bold mb-2">{p.price} ₽</div>
                                        <Button as={Link} to={`/product/${p.id}`} size="sm">Подробнее</Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                        {products.length === 0 && <div className="text-muted">Товары этого центра пока не добавлены</div>}
                    </Row>

                    <h5 className="mt-4 mb-2">Отзывы</h5>
                    <Card>
                        <ListGroup variant="flush">
                            {reviews.map(r => (
                                <ListGroup.Item key={r.id}>
                                    <div className="d-flex justify-content-between">
                                        <div className="fw-semibold">★ {r.rating} — {r.shortReview}</div>
                                        <div className="text-muted small">#{r.orderId}</div>
                                    </div>
                                    <div className="text-muted small">
                                        {r.User ? `${r.User.firstName} ${r.User.lastName}` : 'Аноним'}
                                    </div>
                                    {r.reviewText && <div className="mt-1">{r.reviewText}</div>}
                                </ListGroup.Item>
                            ))}
                            {reviews.length === 0 && <ListGroup.Item className="text-muted">Отзывов пока нет</ListGroup.Item>}
                        </ListGroup>
                    </Card>
                </Col>
            </Row>
        </>
    );
}
