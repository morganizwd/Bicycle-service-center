// client/bicycle-service/src/components/client/requests/CreateServiceRequest.jsx
import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

export default function CreateServiceRequest() {
    const { user } = useAuth(); // проверяем авторизацию именно пользователя
    const navigate = useNavigate();
    const location = useLocation();

    const [centers, setCenters] = useState([]);
    const [loadingCenters, setLoadingCenters] = useState(true);

    const preselectedCenterId = location.state?.serviceCenterId || '';
    const [serviceCenterId, setServiceCenterId] = useState(String(preselectedCenterId));

    // datetime-local требует YYYY-MM-DDTHH:mm
    const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    const [requestDate, setRequestDate] = useState(nowLocal);

    const [bikeModel, setBikeModel] = useState('');
    const [problemDescription, setProblemDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function loadCenters() {
        setLoadingCenters(true);
        try {
            const { data } = await api.get('/service-centers');
            const list = data?.serviceCenters || data || [];
            setCenters(list);
        } catch {
            toast.error('Не удалось загрузить список сервис-центров');
        } finally {
            setLoadingCenters(false);
        }
    }

    useEffect(() => {
        loadCenters();
        // автоподстановка центра из state (если пришли со страницы центра)
        if (preselectedCenterId) setServiceCenterId(String(preselectedCenterId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function submit(e) {
        e.preventDefault();

        if (!user) {
            toast.info('Войдите в аккаунт, чтобы создать заявку');
            navigate('/login', { replace: true, state: { from: '/requests/new' } });
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/serviceRequests', {
                serviceCenterId: Number(serviceCenterId),
                requestDate,          // ISO из input datetime-local ок
                bikeModel: bikeModel || null,
                problemDescription,
            });

            toast.success('Заявка создана');
            navigate('/requests');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Не удалось создать заявку';
            toast.error(msg);
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
                                        <Form.Select
                                            value={serviceCenterId}
                                            onChange={(e) => setServiceCenterId(e.target.value)}
                                            required
                                        >
                                            <option value="">— Выберите центр —</option>
                                            {centers.map((c) => (
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
                                        <Form.Control
                                            value={bikeModel}
                                            onChange={(e) => setBikeModel(e.target.value)}
                                        />
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
