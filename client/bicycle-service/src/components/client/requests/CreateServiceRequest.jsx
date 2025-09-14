import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '/api';

export default function CreateServiceRequest() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [centers, setCenters] = useState([]);
    const [loadingCenters, setLoadingCenters] = useState(true);

    const [serviceCenterId, setServiceCenterId] = useState('');
    const [requestDate, setRequestDate] = useState('');
    const [bikeModel, setBikeModel] = useState('');
    const [problemDescription, setProblemDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function loadCenters() {
        setLoadingCenters(true);
        try {
            const res = await fetch(`${API}/servicecenters`);
            if (!res.ok) throw new Error();
            const payload = await res.json();
            const list = payload?.serviceCenters || payload || [];
            setCenters(list);
        } catch {
            toast.error('Не удалось загрузить список сервис-центров');
        } finally {
            setLoadingCenters(false);
        }
    }

    useEffect(() => { loadCenters(); }, []);

    async function submit(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/servicerequests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    serviceCenterId: Number(serviceCenterId),
                    requestDate,
                    bikeModel,
                    problemDescription
                })
            });
            if (!res.ok) {
                let msg = 'Не удалось создать заявку';
                try { const err = await res.json(); if (err?.message) msg = err.message; } catch { }
                throw new Error(msg);
            }
            toast.success('Заявка создана');
            navigate('/requests');
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <h3 className="mb-3">Новая заявка на сервис</h3>
            <Card>
                <Card.Body>
                    {loadingCenters ? (
                        <div className="d-flex justify-content-center py-5"><Spinner /></div>
                    ) : (
                        <Form onSubmit={submit}>
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Сервисный центр</Form.Label>
                                        <Form.Select value={serviceCenterId} onChange={(e) => setServiceCenterId(e.target.value)} required>
                                            <option value="">— Выберите центр —</option>
                                            {centers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Дата и время</Form.Label>
                                        <Form.Control
                                            type="datetime-local"
                                            value={requestDate}
                                            onChange={(e) => setRequestDate(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Модель велосипеда (необязательно)</Form.Label>
                                        <Form.Control value={bikeModel} onChange={(e) => setBikeModel(e.target.value)} />
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label>Описание проблемы</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={4}
                                            value={problemDescription}
                                            onChange={(e) => setProblemDescription(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <div className="mt-3">
                                <Button type="submit" disabled={submitting}>Создать заявку</Button>
                            </div>
                        </Form>
                    )}
                </Card.Body>
            </Card>
        </>
    );
}
