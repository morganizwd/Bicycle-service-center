import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Badge } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const API = process.env.REACT_APP_API_URL || '/api';

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
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { setParams(queryString); /* eslint-disable-next-line */ }, [queryString]);
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.toString()]);

    return (
        <>
            <h3 className="mb-3">Сервисные центры</h3>

            <Card className="mb-3">
                <Card.Body>
                    <Row className="g-2">
                        <Col md={4}>
                            <Form.Label>Название</Form.Label>
                            <Form.Control value={name} onChange={e => setName(e.target.value)} placeholder="Напр. BikeFix" />
                        </Col>
                        <Col md={4}>
                            <Form.Label>Адрес</Form.Label>
                            <Form.Control value={address} onChange={e => setAddress(e.target.value)} placeholder="Город, улица..." />
                        </Col>
                        <Col md={4}>
                            <Form.Label>Рейтинг от</Form.Label>
                            <Form.Select value={averageRating} onChange={e => setAverageRating(e.target.value)}>
                                <option value="">— любой —</option>
                                {[5, 4.5, 4, 3.5, 3].map(r => <option key={r} value={r}>{r}+</option>)}
                            </Form.Select>
                        </Col>
                    </Row>
                    <div className="mt-3">
                        <Button onClick={load}>Применить</Button>
                    </div>
                </Card.Body>
            </Card>

            {loading ? (
                <div className="d-flex justify-content-center py-5"><Spinner /></div>
            ) : (
                <Row className="g-3">
                    {centers.map(c => {
                        const rating = c.averageRating ?? c?.dataValues?.averageRating;
                        const reviews = c.reviewCount ?? c?.dataValues?.reviewCount;
                        return (
                            <Col key={c.id} md={6} lg={4}>
                                <Card className="h-100">
                                    {c.logo && <Card.Img variant="top" src={c.logo} alt={c.name} style={{ objectFit: 'cover', height: 160 }} />}
                                    <Card.Body>
                                        <Card.Title className="h6">{c.name}</Card.Title>
                                        <div className="text-muted small mb-2">{c.address}</div>
                                        <div className="mb-2">
                                            <Badge bg="warning" text="dark">★ {rating ?? '—'}</Badge>{' '}
                                            <span className="text-muted small">({reviews || 0})</span>
                                        </div>
                                        <Button as={Link} to={`/center/${c.id}`} size="sm">Подробнее</Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                    {centers.length === 0 && <div className="text-muted">Центры не найдены</div>}
                </Row>
            )}
        </>
    );
}
