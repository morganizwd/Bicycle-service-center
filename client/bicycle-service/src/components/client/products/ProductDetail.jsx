// src/components/client/products/ProductDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Spinner, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';
import { mediaUrl } from '../../../utils/media';

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // проверяем именно user
    const [loading, setLoading] = useState(true);
    const [p, setP] = useState(null);
    const [qty, setQty] = useState(1);

    useEffect(() => {
        let aborted = false;
        async function load() {
            setLoading(true);
            try {
                const { data } = await api.get(`/products/${id}`);
                if (!aborted) setP(data);
            } catch {
                if (!aborted) {
                    toast.error('Не удалось загрузить товар');
                    setP(null);
                }
            } finally {
                if (!aborted) setLoading(false);
            }
        }
        load();
        return () => { aborted = true; };
    }, [id]);

    async function addToCart() {
        if (!user) {
            navigate('/login', { replace: true, state: { from: `/product/${id}` } });
            return;
        }
        try {
            await api.post('/carts/add', { productId: p.id, quantity: Number(qty) || 1 });
            toast.success('Добавлено в корзину');
        } catch (e) {
            const msg = e?.response?.data?.message || 'Ошибка при добавлении в корзину';
            toast.error(msg);
        }
    }

    if (loading) return <div className="d-flex justify-content-center py-5"><Spinner /></div>;
    if (!p) return <div className="text-danger">Товар не найден</div>;

    const center = p.ServiceCenter;

    return (
        <>
            <Row className="g-4">
                <Col md={5}>
                    <Card>
                        {p.photo ? (
                            <Card.Img src={mediaUrl(p.photo)} alt={p.name} style={{ objectFit: 'cover', height: 360 }} />
                        ) : (
                            <div className="p-5 text-center text-muted">Нет изображения</div>
                        )}
                    </Card>
                </Col>
                <Col md={7}>
                    <h3 className="mb-1">{p.name}</h3>
                    <div className="text-muted mb-2">{p.brand} {p.model} • {p.category}</div>
                    <div className="mb-2">
                        <Badge bg={p.condition === 'new' ? 'success' : 'secondary'}>{p.condition}</Badge>{' '}
                        <Badge bg={p.stock > 0 ? 'primary' : 'secondary'}>В наличии: {p.stock}</Badge>
                    </div>
                    <h4 className="mb-3">{p.price} ₽</h4>
                    <p>{p.description}</p>
                    {p.warranty && <div className="mb-3"><strong>Гарантия:</strong> {p.warranty}</div>}

                    <div className="d-flex align-items-center gap-2 mb-3">
                        <Form.Label className="mb-0">Кол-во</Form.Label>
                        <Form.Control style={{ width: 100 }} type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
                        <Button onClick={addToCart}>В корзину</Button>
                    </div>

                    {center && (
                        <Card className="mt-3">
                            <Card.Body>
                                <Card.Title className="h6 mb-2">Сервисный центр</Card.Title>
                                <div className="mb-1"><strong>{center.name}</strong></div>
                                <div className="text-muted small">{center.address}</div>
                                <Button as={Link} to={`/center/${center.id}`} variant="link" className="p-0 mt-2">
                                    Перейти в профиль центра →
                                </Button>
                            </Card.Body>
                        </Card>
                    )}
                </Col>
            </Row>
        </>
    );
}
