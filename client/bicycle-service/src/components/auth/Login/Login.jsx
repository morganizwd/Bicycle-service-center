import React, { useState } from 'react';
import { Form, Button, Card } from 'react-bootstrap';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '/api';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { loginUser } = useAuth();

    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const from = location.state?.from?.pathname || '/';

    const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) return toast.warn('Заполните email и пароль');

        setLoading(true);
        try {
            const res = await fetch(`${API}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(`Ошибка входа: ${res.status}`);
            const data = await res.json();
            await loginUser(data.token); // подтянет профиль
            toast.success('Добро пожаловать!');
            navigate(from, { replace: true });
        } catch (err) {
            toast.error('Не удалось войти. Проверьте данные.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mx-auto" style={{ maxWidth: 480 }}>
            <Card.Body>
                <Card.Title>Вход</Card.Title>
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
                    Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
                </div>
            </Card.Body>
        </Card>
    );
}
