import React, { useState } from 'react';
import { Form, Button, Card, Row, Col } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axiosConfig';

const API = process.env.REACT_APP_API_URL || '/api';
const SPECIALIZATIONS = [
    'горные велосипеды', 'шоссейные велосипеды', 'городские велосипеды', 'электровелосипеды'
];

export default function ServiceCenterRegistration() {
    const navigate = useNavigate();
    const { loginServiceCenter } = useAuth();

    const [form, setForm] = useState({
        name: '', contactPerson: '', registrationNumber: '', phone: '',
        email: '', password: '', address: '',
        establishedYear: '', specialization: SPECIALIZATIONS[0],
        offersDelivery: false
    });
    const [logo, setLogo] = useState(null);
    const [loading, setLoading] = useState(false);

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    };
    const onFile = (e) => setLogo(e.target.files?.[0] || null);

    const onSubmit = async (e) => {
        e.preventDefault();
        const required = ['name', 'contactPerson', 'registrationNumber', 'phone', 'email', 'password', 'address', 'specialization'];
        for (const k of required) {
            if (!form[k]) return toast.warn('Заполните все обязательные поля');
        }

        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        if (logo) fd.append('logo', logo);

        setLoading(true);
        try {
            // важный момент: не ставьте руками Content-Type — axios сам проставит boundary
            await api.post('/service-centers/registration', fd);

            // автологин
            const { data } = await api.post('/service-centers/login', {
                email: form.email,
                password: form.password,
            });

            // Сохраняем токен именно как centerToken (совместимо с интерсептором)
            // localStorage.setItem('centerToken', data.token);
            await loginServiceCenter(data.token);

            toast.success('Сервисный центр зарегистрирован');
            navigate('/center/dashboard', { replace: true });
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Не удалось зарегистрировать центр';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mx-auto" style={{ maxWidth: 900 }}>
            <Card.Body>
                <Card.Title>Регистрация сервисного центра</Card.Title>
                <Form onSubmit={onSubmit} encType="multipart/form-data">
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Название *</Form.Label>
                                <Form.Control name="name" value={form.name} onChange={onChange} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Контактное лицо *</Form.Label>
                                <Form.Control name="contactPerson" value={form.contactPerson} onChange={onChange} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Регистрационный номер *</Form.Label>
                                <Form.Control name="registrationNumber" value={form.registrationNumber} onChange={onChange} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Телефон *</Form.Label>
                                <Form.Control name="phone" value={form.phone} onChange={onChange} />
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

                    <Form.Group className="mb-3">
                        <Form.Label>Адрес *</Form.Label>
                        <Form.Control name="address" value={form.address} onChange={onChange} />
                    </Form.Group>

                    <Row>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Год основания</Form.Label>
                                <Form.Control name="establishedYear" type="number" value={form.establishedYear} onChange={onChange} placeholder="например, 2018" />
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group className="mb-3">
                                <Form.Label>Специализация *</Form.Label>
                                <Form.Select name="specialization" value={form.specialization} onChange={onChange}>
                                    {SPECIALIZATIONS.map(s => <option value={s} key={s}>{s}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-center">
                            <Form.Check
                                type="checkbox"
                                label="Есть доставка"
                                name="offersDelivery"
                                checked={form.offersDelivery}
                                onChange={onChange}
                            />
                        </Col>
                    </Row>

                    <Form.Group className="mb-4">
                        <Form.Label>Логотип</Form.Label>
                        <Form.Control type="file" accept="image/*" onChange={onFile} />
                    </Form.Group>

                    <Button type="submit" disabled={loading} className="w-100">
                        {loading ? 'Отправка…' : 'Зарегистрировать центр'}
                    </Button>
                </Form>
                <div className="mt-3">
                    Уже зарегистрированы? <Link to="/center/login">Войти</Link>
                </div>
            </Card.Body>
        </Card>
    );
}