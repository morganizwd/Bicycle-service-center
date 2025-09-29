import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Form, Button, Spinner, InputGroup, Badge } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';
import { mediaUrl } from '../../../utils/media';

import './ProductCatalog.css';

function fmtPrice(v) {
    const n = Number(v || 0);
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 0 }) + ' ₽';
}

export default function ProductCatalog() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [addingId, setAddingId] = useState(null);

    // фильтры из URL
    const [q, setQ] = useState(params.get('q') || '');
    const [category, setCategory] = useState(params.get('category') || '');
    const [brand, setBrand] = useState(params.get('brand') || '');
    const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
    const [inStock, setInStock] = useState(params.get('inStock') === 'true');

    // объект для ?query, без пустых значений
    const queryObj = useMemo(() => {
        const o = {};
        if (q) o.q = q;
        if (category) o.category = category;
        if (brand) o.brand = brand;
        if (minPrice) o.minPrice = minPrice;
        if (maxPrice) o.maxPrice = maxPrice;
        if (inStock) o.inStock = 'true';
        return o;
    }, [q, category, brand, minPrice, maxPrice, inStock]);

    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get('/products', { params: queryObj });
            setItems(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Не удалось загрузить товары');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    // синхронизируем адресную строку с локальными фильтрами
    useEffect(() => {
        const sp = new URLSearchParams(queryObj);
        setParams(sp);
    }, [queryObj, setParams]);

    // грузим при изменении querystring
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.toString()]);

    async function addToCart(product) {
        if (!user) {
            navigate('/login', { replace: true, state: { from: '/products' } });
            return;
        }
        try {
            setAddingId(product.id);
            await api.post('/carts/add', { productId: product.id, quantity: 1 });
            toast.success('Добавлено в корзину');
        } catch (e) {
            const msg = e?.response?.data?.message || 'Ошибка при добавлении в корзину';
            toast.error(msg);
        } finally {
            setAddingId(null);
        }
    }

    const heroUrl = `${process.env.PUBLIC_URL}/images/hero-bike.jpg`;
    const placeholderUrl = `${process.env.PUBLIC_URL}/images/placeholder-product.jpg`;

    return (
        <>
            {/* HERO */}
            <Card className="catalog-hero mb-4">
                <div className="catalog-hero__img" style={{ '--hero-url': `url("${heroUrl}")` }} />
                <div className="catalog-hero__overlay" />
                <Card.Body className="position-relative">
                    <div className="catalog-hero__content">
                        <div className="text-muted small mb-2">Каталог</div>
                        <h1 className="display-6 fw-semibold mb-2">Запчасти и аксессуары для велосипеда</h1>
                        <p className="text-secondary mb-3">
                            Идеальные компоненты для апгрейда и обслуживания. Фильтры по брендам, категориям, наличию и цене.
                        </p>
                        <div className="d-flex gap-2">
                            <Button as={Link} to="/centers" variant="outline-dark" size="sm">
                                Найти сервисный центр
                            </Button>
                            <Button variant="dark" size="sm" onClick={load}>
                                Обновить список
                            </Button>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* FILTER BAR */}
            <Card className="catalog-filter mb-3">
                <Card.Body>
                    <Row className="g-3 align-items-end">
                        <Col lg={4}>
                            <Form.Label>Поиск</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Название или описание…"
                                />
                                <Button onClick={load}>Найти</Button>
                            </InputGroup>
                        </Col>
                        <Col lg={2}>
                            <Form.Label>Категория</Form.Label>
                            <Form.Control
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Напр. тормоза"
                            />
                        </Col>
                        <Col lg={2}>
                            <Form.Label>Бренд</Form.Label>
                            <Form.Control
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                placeholder="Напр. Shimano"
                            />
                        </Col>
                        <Col lg={2}>
                            <Form.Label>Цена от</Form.Label>
                            <Form.Control
                                type="number"
                                min="0"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                            />
                        </Col>
                        <Col lg={2}>
                            <Form.Label>до</Form.Label>
                            <Form.Control
                                type="number"
                                min="0"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                            />
                        </Col>
                        <Col xs={12}>
                            <Form.Check
                                label="Показывать только в наличии"
                                checked={inStock}
                                onChange={(e) => setInStock(e.target.checked)}
                            />
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* GRID */}
            {loading ? (
                <div className="d-flex justify-content-center py-5">
                    <Spinner />
                </div>
            ) : (
                <>
                    <Row className="g-3">
                        {items.map((p) => {
                            const outOfStock = Number(p.stock) <= 0;
                            const adding = addingId === p.id;
                            const img = p.photo ? mediaUrl(p.photo) : placeholderUrl;
                            return (
                                <Col key={p.id} sm={6} md={4} lg={3}>
                                    <Card className="pcard h-100">
                                        <div className="pcard__img" style={{ '--img': `url("${img}")` }}>
                                            {outOfStock ? (
                                                <Badge bg="secondary" className="pcard__ribbon">Нет в наличии</Badge>
                                            ) : (
                                                <Badge bg="success" className="pcard__ribbon">В наличии</Badge>
                                            )}
                                        </div>
                                        <Card.Body className="d-flex flex-column pcard__body">
                                            <Card.Title className="h6 mb-1">{p.name}</Card.Title>
                                            <div className="text-muted small mb-2">{p.brand} {p.model}</div>
                                            <div className="fw-semibold fs-5 mb-3">{fmtPrice(p.price)}</div>

                                            <div className="mt-auto d-flex gap-2">
                                                <Button
                                                    as={Link}
                                                    to={`/product/${p.id}`}
                                                    size="sm"
                                                    variant="outline-dark"
                                                >
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
                    </Row>

                    {items.length === 0 && (
                        <Card className="catalog-empty mt-3" body>
                            Ничего не найдено. Попробуйте изменить фильтры.
                        </Card>
                    )}
                </>
            )}
        </>
    );
}
