// client/bicycle-service/src/components/client/centers/ServiceCenterDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Row, Col, Card, ListGroup, Spinner, Button, Badge, Modal, Form
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';
import { mediaUrl } from '../../../utils/media';

const API = process.env.REACT_APP_API_URL || '/api';

export default function ServiceCenterDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // если нет user — просим войти перед отзывом

    const [center, setCenter] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- отзыв (UI/данные) ---
    const [showReview, setShowReview] = useState(false);
    const [eligibleOrders, setEligibleOrders] = useState([]); // доставленные заказы этого центра
    const [orderItems, setOrderItems] = useState([]);         // позиции выбранного заказа
    const [review, setReview] = useState({
        rating: 5,
        shortReview: '',
        reviewText: '',
        orderId: '',
        productId: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [itemsLoading, setItemsLoading] = useState(false);

    // ===== Загрузка центра =====
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

    const products = center?.Products || center?.products || [];
    const reviews = center?.Reviews || center?.reviews || [];

    // ===== Открыть форму отзыва =====
    async function openReviewModal() {
        if (!user) {
            navigate('/login', { replace: true, state: { from: `/center/${id}` } });
            return;
        }
        setShowReview(true);
        // пробуем подтянуть завершённые заказы пользователя по этому центру
        setOrdersLoading(true);
        try {
            // Популярные варианты эндпоинтов. Первый — предпочтительный.
            // Если бэкенд у вас другой, просто вернётся пусто — оставим manual-поле.
            let orders = [];
            try {
                const { data } = await api.get('/orders/my', {
                    params: { serviceCenterId: id, status: 'delivered' },
                });
                orders = Array.isArray(data) ? data : [];
            } catch {
                const { data } = await api.get('/orders', {
                    params: { serviceCenterId: id, status: 'delivered', mine: 'true' },
                });
                orders = Array.isArray(data) ? data : [];
            }
            setEligibleOrders(orders);
        } catch {
            setEligibleOrders([]);
        } finally {
            setOrdersLoading(false);
        }
    }

    function closeReviewModal() {
        setShowReview(false);
        setReview({ rating: 5, shortReview: '', reviewText: '', orderId: '', productId: '' });
        setOrderItems([]);
    }

    // Когда пользователь выбрал заказ — подгружаем его позиции
    async function onSelectOrder(orderId) {
        setReview(r => ({ ...r, orderId, productId: '' }));
        setOrderItems([]);
        if (!orderId) return;
        setItemsLoading(true);
        try {
            const { data } = await api.get(`/orders/${orderId}`);
            const items = data?.orderItems || data?.OrderItems || [];
            setOrderItems(items);
        } catch {
            setOrderItems([]);
        } finally {
            setItemsLoading(false);
        }
    }

    // Отправка отзыва
    async function submitReview(e) {
        e.preventDefault();
        if (!review.orderId) {
            toast.warn('Выберите заказ или введите его ID');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                rating: Number(review.rating),
                shortReview: review.shortReview?.trim(),
                reviewText: review.reviewText?.trim(),
                orderId: Number(review.orderId),
                productId: review.productId ? Number(review.productId) : undefined,
            };
            const { data: created } = await api.post('/reviews', payload);
            toast.success('Спасибо! Ваш отзыв отправлен.');

            // добавим отзыв в список без перезагрузки страницы
            setCenter(c => {
                const prev = c?.Reviews || c?.reviews || [];
                return { ...c, Reviews: [created, ...prev] };
            });

            closeReviewModal();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Не удалось отправить отзыв';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <div className="d-flex justify-content-center py-5"><Spinner /></div>;
    if (!center) return <div className="text-danger">Сервисный центр не найден</div>;

    return (
        <>
            <Row className="g-4">
                <Col md={4}>
                    <Card>
                        {center.logo ? (
                            <Card.Img src={mediaUrl(center.logo)} alt={center.name} style={{ objectFit: 'cover', height: 220 }} />
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
                            <div className="mt-3 d-flex flex-column gap-2">
                                <Button
                                    variant="primary"
                                    onClick={() => navigate('/requests/new', { state: { serviceCenterId: center.id } })}
                                >
                                    Оформить заявку на обслуживание
                                </Button>
                                <Button variant="outline-secondary" onClick={openReviewModal}>
                                    Оставить отзыв
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
                                    {p.photo && (
                                        <Card.Img
                                            variant="top"
                                            src={p.photo}
                                            alt={p.name}
                                            style={{ objectFit: 'cover', height: 140 }}
                                        />
                                    )}
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
                            {reviews.length === 0 && (
                                <ListGroup.Item className="text-muted">Отзывов пока нет</ListGroup.Item>
                            )}
                        </ListGroup>
                    </Card>
                </Col>
            </Row>

            {/* ===== МОДАЛЬНОЕ ОКНО ОТЗЫВА ===== */}
            <Modal show={showReview} onHide={closeReviewModal} centered>
                <Form onSubmit={submitReview}>
                    <Modal.Header closeButton>
                        <Modal.Title>Оставить отзыв</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {/* Выбор заказа */}
                        <Form.Group className="mb-3">
                            <Form.Label>Заказ (должен быть со статусом “delivered”)</Form.Label>
                            {ordersLoading ? (
                                <div className="d-flex align-items-center gap-2">
                                    <Spinner size="sm" /> <span className="text-muted">Загрузка…</span>
                                </div>
                            ) : eligibleOrders.length > 0 ? (
                                <Form.Select
                                    value={review.orderId}
                                    onChange={(e) => onSelectOrder(e.target.value)}
                                >
                                    <option value="">— Выберите заказ —</option>
                                    {eligibleOrders.map(o => (
                                        <option key={o.id} value={o.id}>
                                            #{o.id} • {new Date(o.orderDate).toLocaleString('ru-RU')} • {o.totalCost} ₽
                                        </option>
                                    ))}
                                </Form.Select>
                            ) : (
                                <>
                                    <Form.Control
                                        placeholder="Введите ID вашего заказа"
                                        value={review.orderId}
                                        onChange={(e) => onSelectOrder(e.target.value)}
                                    />
                                    <div className="form-text">
                                        Подходящие заказы не найдены автоматически. Введите ID вручную.
                                    </div>
                                </>
                            )}
                        </Form.Group>

                        {/* Товары из заказа (необязательно) */}
                        <Form.Group className="mb-3">
                            <Form.Label>Товар (необязательно)</Form.Label>
                            {itemsLoading ? (
                                <div className="d-flex align-items-center gap-2">
                                    <Spinner size="sm" /> <span className="text-muted">Загрузка…</span>
                                </div>
                            ) : (
                                <Form.Select
                                    value={review.productId}
                                    onChange={(e) => setReview(r => ({ ...r, productId: e.target.value }))}
                                    disabled={!review.orderId || orderItems.length === 0}
                                >
                                    <option value="">— Без привязки к товару —</option>
                                    {orderItems.map(oi => (
                                        <option key={oi.id} value={oi.productId}>
                                            {oi.Product?.name || `Товар #${oi.productId}`} × {oi.quantity}
                                        </option>
                                    ))}
                                </Form.Select>
                            )}
                        </Form.Group>

                        {/* Рейтинг / заголовок / текст */}
                        <Row className="g-2">
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Оценка</Form.Label>
                                    <Form.Select
                                        value={review.rating}
                                        onChange={(e) => setReview(r => ({ ...r, rating: e.target.value }))}
                                    >
                                        {[5, 4, 3, 2, 1].map(n => (
                                            <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={8}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Кратко</Form.Label>
                                    <Form.Control
                                        value={review.shortReview}
                                        onChange={(e) => setReview(r => ({ ...r, shortReview: e.target.value }))}
                                        placeholder="Одной фразой…"
                                        maxLength={120}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group>
                            <Form.Label>Развёрнутый отзыв</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={review.reviewText}
                                onChange={(e) => setReview(r => ({ ...r, reviewText: e.target.value }))}
                                placeholder="Опишите ваш опыт обслуживания…"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={closeReviewModal}>Отмена</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Отправка…' : 'Отправить отзыв'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
}
