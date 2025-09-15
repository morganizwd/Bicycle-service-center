import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Badge } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { mediaUrl } from '../../../utils/media';

import './ServiceCenterCatalog.css';

const API = process.env.REACT_APP_API_URL || '/api';

function fmtRating(v) {
    if (v === null || v === undefined) return '—';
    const n = Number(v);
    if (Number.isNaN(n)) return '—';
    return n.toFixed(1);
}

export default function ServiceCenterCatalog() {
    const [params, setParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [centers, setCenters] = useState([]);

    const [name, setName] = useState(params.get('name') || '');
    const [address, setAddress] = useState(params.get('address') || '');
    const [averageRating, setAverageRating] = useState(params.get('averageRating') || '');

    const queryString = useMemo(() => {
        const p = new URLSearchParams();
        if (name) p.set('name', name);
        if (address) p.set('address', address);
        if (averageRating) p.set('averageRating', averageRating);
        return p.toString();
    }, [name, address, averageRating]);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/service-centers${queryString ? `?${queryString}` : ''}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setCenters(data.serviceCenters || data.rows || []);
        } catch {
            toast.error('Не удалось загрузить сервисные центры');
            setCenters([]);
        } finally {
            setLoading(false);
        }
    }

    // синхронизируем URL с локальными фильтрами
    useEffect(() => {
        setParams(queryString);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryString]);

    // грузим при изменении querystring
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.toString()]);

    const heroUrl = `${process.env.PUBLIC_URL}/images/os-bike.jpg`;
    const placeholderLogo = `${process.env.PUBLIC_URL}/images/placeholder-center.jpg`;

    return (
        <>
            {/* HERO */}
            <Card className="sc-hero mb-4">
                <div className="sc-hero__img" style={{ '--hero-url': `url("${heroUrl}")` }} />
                <div className="sc-hero__overlay" />
                <Card.Body className="position-relative">
                    <div className="sc-hero__content">
                        <div className="text-muted small mb-2">Сервисные центры</div>
                        <h1 className="display-6 fw-semibold mb-2">Найдите мастерскую рядом</h1>
                        <p className="text-secondary mb-3">
                            Записывайтесь на обслуживание, читайте отзывы и выбирайте центр по рейтингу и специализации.
                        </p>
                        <div className="d-flex gap-2">
                            <Button variant="dark" size="sm" onClick={load}>Обновить список</Button>
                            <Button
                                variant="outline-dark"
                                size="sm"
                                onClick={() => { setName(''); setAddress(''); setAverageRating(''); }}
                            >
                                Сбросить фильтры
                            </Button>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* FILTERS */}
            <Card className="sc-filter mb-3">
                <Card.Body>
                    <Row className="g-3 align-items-end">
                        <Col md={4}>
                            <Form.Label>Название</Form.Label>
                            <Form.Control
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Напр. BikeFix"
                            />
                        </Col>
                        <Col md={4}>
                            <Form.Label>Адрес</Form.Label>
                            <Form.Control
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Город, улица…"
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Label>Рейтинг от</Form.Label>
                            <Form.Select
                                value={averageRating}
                                onChange={(e) => setAverageRating(e.target.value)}
                            >
                                <option value="">— любой —</option>
                                {[5, 4.5, 4, 3.5, 3].map((r) => (
                                    <option key={r} value={r}>{r}+</option>
                                ))}
                            </Form.Select>
                        </Col>
                        <Col md={1} className="d-grid">
                            <Button onClick={load}>Искать</Button>
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
                        {centers.map((c) => {
                            const rating = c.averageRating ?? c?.dataValues?.averageRating;
                            const reviews = c.reviewCount ?? c?.dataValues?.reviewCount;
                            const img = c.logo ? mediaUrl(c.logo) : placeholderLogo;
                            const spec = c.specialization || '';
                            return (
                                <Col key={c.id} md={6} lg={4}>
                                    <Card className="ccard h-100">
                                        <div className="ccard__img" style={{ '--img': `url("${img}")` }}>
                                            {c.offersDelivery && (
                                                <Badge bg="success" className="ccard__ribbon">Есть доставка</Badge>
                                            )}
                                        </div>
                                        <Card.Body className="d-flex flex-column ccard__body">
                                            <Card.Title className="h6 mb-1">{c.name}</Card.Title>
                                            <div className="text-muted small mb-2">{c.address}</div>

                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <Badge bg="warning" text="dark">★ {fmtRating(rating)}</Badge>
                                                <span className="text-muted small">({reviews || 0})</span>
                                            </div>

                                            {spec && (
                                                <div className="text-muted small mb-3">
                                                    Специализация: <span className="fw-medium">{spec}</span>
                                                </div>
                                            )}

                                            <div className="mt-auto">
                                                <Button as={Link} to={`/center/${c.id}`} variant="outline-dark" size="sm">
                                                    Подробнее
                                                </Button>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>

                    {centers.length === 0 && (
                        <Card className="sc-empty mt-3" body>
                            Центры не найдены. Попробуйте изменить фильтры.
                        </Card>
                    )}
                </>
            )}
        </>
    );
}
