import React from 'react';
import { Button, Row, Col, Card, Badge, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
    const navigate = useNavigate();

    // если изображения лежат в public/images
    const heroUrl = `${process.env.PUBLIC_URL}/images/hero-bike.jpg`;
    const sideUrl = `${process.env.PUBLIC_URL}/images/side-bike.jpg`;
    const osUrl = `${process.env.PUBLIC_URL}/images/os-bike.jpg`;

    return (
        <>
            <div className="home-topbar text-center py-2 px-3">
                Какая модель e-bike вам подходит? Скидка −15% на тест-драйв
                <Button
                    variant="link"
                    className="p-0 align-baseline text-white text-decoration-underline ms-1"
                    onClick={() => navigate('/products')}
                >
                    Узнать →
                </Button>
            </div>

            <Container fluid className="px-3 px-md-4 px-lg-5 mt-3">
                <Row className="g-3">
                    {/* HERO */}
                    <Col lg={8}>
                        <Card className="home-hero overflow-hidden">
                            {/* передаём картинку через CSS-переменную */}
                            <div
                                className="home-hero__img"
                                style={{ ['--hero-url']: `url("${heroUrl}")` }}
                            />
                            <div className="home-hero__overlay" />
                            <Card.Body className="home-hero__content">
                                <Badge bg="dark" className="mb-2 opacity-75">Gasyo</Badge>
                                <h1 className="display-6 fw-semibold mb-2">
                                    Начни путь на велосипеде<br />с новым ощущением
                                </h1>
                                <p className="text-muted mb-3">
                                    Электро и классика: лёгкость хода, продуманная геометрия, сервис рядом.
                                </p>
                                <div className="d-flex gap-2">
                                    <Button as={Link} to="/products" size="sm" variant="dark">Купить сейчас</Button>
                                    <Button as={Link} to="/centers" size="sm" variant="outline-dark">Найти сервис</Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Боковой тайл */}
                    <Col lg={4}>
                        <Card className="h-100 home-side">
                            <div
                                className="home-side__img"
                                style={{ ['--side-url']: `url("${sideUrl}")` }}
                            />
                            <Card.Body>
                                <h4 className="h5">Минималистичный e-bike для города</h4>
                                <p className="text-muted mb-2">
                                    Мощность на каждый день. Легко удерживает темп, экономит заряд.
                                </p>
                                <Button as={Link} to="/products" size="sm" variant="link" className="p-0">
                                    Подробнее →
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Преимущества */}
                <Row className="g-3 mt-3">
                    <Col lg={6}>
                        <Card className="h-100">
                            <Card.Body className="d-flex flex-column">
                                <h3 className="h4">Мы делаем поездки счастливыми</h3>
                                <p className="text-muted">
                                    Интеграция с трекингом, быстрая зарядка и честный сервис — всё в одной экосистеме.
                                </p>
                                <div className="mt-auto d-flex gap-2">
                                    <Button as={Link} to="/centers" variant="primary" size="sm">Записаться на сервис</Button>
                                    <Button as={Link} to="/requests/new" variant="outline-primary" size="sm">Создать заявку</Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={6}>
                        <Row className="g-3">
                            <Col sm={6}>
                                <Card className="h-100 home-feature">
                                    <div className="home-feature__icon">⚡</div>
                                    <Card.Body>
                                        <div className="fw-semibold mb-1">Быстрая подзарядка</div>
                                        <div className="text-muted small">До 80% за 40 минут.</div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col sm={6}>
                                <Card className="h-100 home-feature dark">
                                    <div className="home-feature__icon">🔒</div>
                                    <Card.Body>
                                        <div className="fw-semibold mb-1 text-white">Умная защита</div>
                                        <div className="small text-white-50">Блокировка и уведомления в приложении.</div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col sm={6}>
                                <Card className="h-100 home-feature">
                                    <div className="home-feature__icon">🌱</div>
                                    <Card.Body>
                                        <div className="fw-semibold mb-1">Чистая энергия</div>
                                        <div className="text-muted small">Eco-режим для дальних поездок.</div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col sm={6}>
                                <Card className="h-100 home-feature">
                                    <div className="home-feature__icon">📡</div>
                                    <Card.Body>
                                        <div className="fw-semibold mb-1">Подключение</div>
                                        <div className="text-muted small">Телеметрия и диагностика в один клик.</div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Col>
                </Row>

                {/* Тех блок */}
                <Row className="g-3 mt-3 align-items-stretch">
                    <Col lg={6}>
                        <Card className="h-100">
                            <Card.Body>
                                <h3 className="h4 mb-2">Adaptive Drive OS</h3>
                                <p className="text-muted">
                                    Управление тягой, анализ рельефа и авто-переключение режимов.
                                </p>
                                <ul className="list-unstyled small text-muted mb-0">
                                    <li>• Режимы Eco / City / Sport</li>
                                    <li>• Автодиагностика узлов</li>
                                    <li>• Синхронизация с сервис-центрами</li>
                                </ul>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={6}>
                        <Card className="h-100 home-os">
                            <div
                                className="home-os__img"
                                style={{ ['--os-url']: `url("${osUrl}")` }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* CTA */}
                <Card className="mt-4 home-cta">
                    <Card.Body className="d-flex flex-column flex-md-row align-items-md-center justify-content-between">
                        <div>
                            <div className="h5 mb-1">Готовы прокатиться?</div>
                            <div className="text-muted">Выберите модель и запишитесь на тест-драйв в ближайшем центре.</div>
                        </div>
                        <div className="mt-3 mt-md-0 d-flex gap-2">
                            <Button as={Link} to="/products" variant="dark">Каталог</Button>
                            <Button as={Link} to="/centers" variant="outline-dark">Центры</Button>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </>
    );
}
