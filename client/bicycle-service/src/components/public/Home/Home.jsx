import React from 'react';
import { Button, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <>
            <div className="p-4 mb-4 bg-light rounded">
                <h2 className="mb-2">Сервисные центры и велотовары</h2>
                <p className="text-muted mb-3">
                    Найдите сервисный центр поблизости, записывайтесь на обслуживание и покупайте запчасти/аксессуары.
                </p>
                <div className="d-flex gap-2">
                    <Button as={Link} to="/products" variant="primary">Каталог товаров</Button>
                    <Button as={Link} to="/centers" variant="outline-primary">Сервисные центры</Button>
                </div>
            </div>

            <Row className="g-3">
                <Col md={6}>
                    <Card>
                        <Card.Body>
                            <Card.Title>Покупайте запчасти</Card.Title>
                            <Card.Text>Фильтрация по категориям, брендам и наличию. Удобная карточка товара.</Card.Text>
                            <Button as={Link} to="/products">Перейти в каталог</Button>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card>
                        <Card.Body>
                            <Card.Title>Обслуживание велосипеда</Card.Title>
                            <Card.Text>Выберите сервисный центр и оформите заявку на обслуживание.</Card.Text>
                            <Button as={Link} to="/centers" variant="outline-secondary">Найти центр</Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </>
    );
}
