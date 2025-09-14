import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Form, Button, Spinner, InputGroup } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '/api';

export default function ProductCatalog() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [addingId, setAddingId] = useState(null); // id товара, который добавляется сейчас

    // локальная форма фильтров
    const [q, setQ] = useState(params.get('q') || '');
    const [category, setCategory] = useState(params.get('category') || '');
    const [brand, setBrand] = useState(params.get('brand') || '');
    const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
    const [inStock, setInStock] = useState(params.get('inStock') === 'true');

    const queryString = useMemo(() => {
        const p = new URLSearchParams();
        if (q) p.set('q', q);
        if (category) p.set('category', category);
        if (brand) p.set('brand', brand);
        if (minPrice) p.set('minPrice', minPrice);
        if (maxPrice) p.set('maxPrice', maxPrice);
        if (inStock) p.set('inStock', 'true');
        return p.toString();
    }, [q, category, brand, minPrice, maxPrice, inStock]);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/products${queryString ? `?${queryString}` : ''}`);
            if (!res.ok) throw new Error();
            setItems(await res.json());
        } catch {
            toast.error('Не удалось загрузить товары');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setParams(queryString);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryString]);

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.toString()]);

    async function addToCart(product) {
        if (!token) {
            navigate('/login', { replace: true, state: { from: '/products' } });
            return;
        }
        try {
            setAddingId(product.id);
            const res = await fetch(`${API}/cart/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ productId: product.id, quantity: 1 })
            });
            if (!res.ok) {
                // пробуем вывести текст ошибки от бэка (например «товары только из одного сервисного центра»)
                let msg = 'Ошибка при добавлении в корзину';
                try {
                    const err = await res.json();
                    if (err?.message) msg = err.message;
                } catch { }
                throw new Error(msg);
            }
            toast.success('Добавлено в корзину');
        } catch (e) {
            toast.error(e.message || 'Ошибка при добавлении в корзину');
        } finally {
            setAddingId(null);
        }
    }

    return (
        <>
            <h3 className="mb-3">Каталог товаров</h3>

            <Card className="mb-3">
                <Card.Body>
                    <Row className="g-2 align-items-end">
                        <Col md={4}>
                            <Form.Label>Поиск</Form.Label>
                            <InputGroup>
                                <Form.Control value={q} onChange={(e) => setQ(e.target.value)} placeholder="Название или описание..." />
                                <Button onClick={load}>Найти</Button>
                            </InputGroup>
                        </Col>
                        <Col md={2}>
                            <Form.Label>Категория</Form.Label>
                            <Form.Control value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Напр. тормоза" />
                        </Col>
                        <Col md={2}>
                            <Form.Label>Бренд</Form.Label>
                            <Form.Control value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Напр. Shimano" />
                        </Col>
                        <Col md={2}>
                            <Form.Label>Цена от</Form.Label>
                            <Form.Control type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                        </Col>
                        <Col md={2}>
                            <Form.Label>до</Form.Label>
                            <Form.Control type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                        </Col>
                        <Col md={2} className="mt-2">
                            <Form.Check label="Только в наличии" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {loading ? (
                <div className="d-flex justify-content-center py-5"><Spinner /></div>
            ) : (
                <Row className="g-3">
                    {items.map((p) => {
                        const outOfStock = Number(p.stock) <= 0;
                        const adding = addingId === p.id;
                        return (
                            <Col key={p.id} sm={6} md={4} lg={3}>
                                <Card className="h-100 d-flex">
                                    {p.photo && (
                                        <Card.Img
                                            variant="top"
                                            src={p.photo}
                                            alt={p.name}
                                            style={{ objectFit: 'cover', height: 160 }}
                                        />
                                    )}
                                    <Card.Body className="d-flex flex-column">
                                        <Card.Title className="h6">{p.name}</Card.Title>
                                        <div className="text-muted small mb-1">{p.brand} {p.model}</div>
                                        <div className="fw-bold mb-3">{p.price} ₽</div>
                                        <div className="mt-auto d-flex gap-2">
                                            <Button as={Link} to={`/product/${p.id}`} size="sm" variant="outline-secondary">
                                                Подробнее
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => addToCart(p)}
                                                disabled={outOfStock || adding}
                                            >
                                                {adding ? 'Добавляем…' : outOfStock ? 'Нет в наличии' : 'В корзину'}
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                    {items.length === 0 && <div className="text-muted">Ничего не найдено</div>}
                </Row>
            )}
        </>
    );
}
