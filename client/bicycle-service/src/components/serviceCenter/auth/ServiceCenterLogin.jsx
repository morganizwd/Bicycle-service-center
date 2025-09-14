// src/components/serviceCenter/auth/ServiceCenterLogin.jsx
import React, { useState } from 'react';
import { Form, Button, Card } from 'react-bootstrap';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

export default function ServiceCenterLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const { loginServiceCenter } = useAuth();

    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const from = location.state?.from?.pathname || '/center/dashboard';

    const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) return toast.warn('Заполните email и пароль');
        setLoading(true);
        try {
            const { data } = await api.post('/service-centers/login', form);
            await loginServiceCenter(data.token);
            toast.success('Вход выполнен');
            navigate(from, { replace: true });
        } catch {
            toast.error('Не удалось войти');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mx-auto" style={{ maxWidth: 480 }}>
            <Card.Body>
                <Card.Title>Вход сервисного центра</Card.Title>
                <Form onSubmit={onSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control name="email" type="email" value={form.email} onChange={onChange} autoFocus />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Пароль</Form.Label>
                        <Form.Control name="password" type="password" value={form.password} onChange={onChange} />
                    </Form.Group>
                    <Button type="submit" disabled={loading} className="w-100">
                        {loading ? 'Входим…' : 'Войти'}
                    </Button>
                </Form>
                <div className="mt-3">
                    Нет аккаунта? <Link to="/center/register">Зарегистрировать центр</Link>
                </div>
            </Card.Body>
        </Card>
    );
}
