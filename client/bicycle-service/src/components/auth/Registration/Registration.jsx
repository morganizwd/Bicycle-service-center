import React, { useState } from 'react';
import { Form, Button, Card, Row, Col } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '/api';

export default function Registration() {
    const navigate = useNavigate();
    const { loginUser } = useAuth();

    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', password: '',
        phone: '', birthDate: '', address: ''
    });
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);

    const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    const onFile = (e) => setPhoto(e.target.files?.[0] || null);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.firstName || !form.lastName || !form.email || !form.password || !form.phone) {
            return toast.warn('Заполните обязательные поля');
        }

        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => v !== '' && fd.append(k, v));
        if (photo) fd.append('photo', photo);

        setLoading(true);
        try {
            const res = await fetch(`${API}/users/registration`, {
                method: 'POST',
                body: fd,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            // после регистрации сразу логинимся
            const loginRes = await fetch(`${API}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, password: form.password }),
            });
            if (!loginRes.ok) throw new Error('auto-login failed');
            const data = await loginRes.json();
            await loginUser(data.token);
            toast.success('Регистрация успешна!');
            navigate('/', { replace: true });
        } catch (err) {
            toast.error('Не удалось зарегистрироваться');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mx-auto" style={{ maxWidth: 720 }}>
            <Card.Body>
                <Card.Title>Регистрация пользователя</Card.Title>
                <Form onSubmit={onSubmit} encType="multipart/form-data">
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Имя *</Form.Label>
                                <Form.Control name="firstName" value={form.firstName} onChange={onChange} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Фамилия *</Form.Label>
                                <Form.Control name="lastName" value={form.lastName} onChange={onChange} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Email *</Form.Label>
                                <Form.Control type="email" name="email" value={form.email} onChange={onChange} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Пароль *</Form.Label>
                                <Form.Control type="password" name="password" value={form.password} onChange={onChange} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Телефон *</Form.Label>
                                <Form.Control name="phone" value={form.phone} onChange={onChange} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Дата рождения</Form.Label>
                                <Form.Control type="date" name="birthDate" value={form.birthDate} onChange={onChange} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Адрес</Form.Label>
                        <Form.Control name="address" value={form.address} onChange={onChange} />
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label>Фото (опционально)</Form.Label>
                        <Form.Control type="file" accept="image/*" onChange={onFile} />
                    </Form.Group>

                    <Button type="submit" disabled={loading} className="w-100">
                        {loading ? 'Отправка…' : 'Зарегистрироваться'}
                    </Button>
                </Form>
                <div className="mt-3">
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
                </div>
            </Card.Body>
        </Card>
    );
}